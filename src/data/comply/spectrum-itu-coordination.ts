/**
 * Spectrum / ITU Coordination for Satellite Operators
 * — first-class regulatory dataset.
 *
 * Covers the international + national spectrum-regulatory layer that gates
 * every operational satellite. No FCC Part 25 / Ofcom space licence /
 * BNetzA frequency assignment is granted without a coordinated ITU filing,
 * and no commercial sat earth station can be operated without national
 * spectrum authorisation. This is the foundational regulatory layer that
 * sits beneath debris, in-orbit servicing, and operator authorisation
 * regimes.
 *
 * **Major regulatory shifts (2019-2026):**
 *   - WRC-19 (Sharm El-Sheikh) overhauled the EPFD limits framework
 *     protecting GSO networks from NGSO interference (RR Article 22 +
 *     Resolution 76). Final ITU-R Recommendation S.1503-3 set the
 *     calculation methodology.
 *   - WRC-23 (Dubai, Dec 2023) tightened Resolution 32 timelines for
 *     bringing-into-use of NGSO frequency assignments and introduced a
 *     stricter "milestones" approach: at 2/5/7 years a notified NGSO
 *     constellation must demonstrate progressive deployment percentages.
 *   - FCC 22-21 (May 2022) "Non-Geostationary Satellite Spectrum Sharing"
 *     created the formal NGSO-NGSO sharing framework for the US, with
 *     defined coordination triggers + spectrum-splitting rules.
 *   - FCC Streamlined Earth Station Licensing (2022) created a fast-track
 *     authorisation for small Ka/Ku-band earth stations meeting the
 *     ITU-R S.580-6 sidelobe envelope.
 *   - BNetzA Frequenzverordnung 2024 consolidated the German frequency
 *     plan and introduced new Allgemeinzuteilungen for VSAT terminals.
 *   - ETSI EN 303 645 v2.1.1 (cyber for satellite IoT, 2024) became
 *     binding via the RED Delegated Act 2024/202.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **7 years** — Resolution 32 bringing-into-use deadline; filings
 *     not brought into use within 7 years of notice date are cancelled.
 *   - **6%** — ΔT/T threshold in RR Appendix 8 triggering Article 9
 *     coordination between administrations.
 *   - **+18 dBW / 4 kHz** — FCC Part 25.218 off-axis EIRP density limit
 *     for cubesat S-band telemetry (typical narrowband Earth-to-space).
 *   - **27 dB** — Cross-polarisation isolation floor for fixed-sat
 *     earth stations (ITU-R S.580-6, ETSI standards).
 *   - **-160 dB(W/m²/MHz)** — Indicative single-entry EPFD limit on
 *     GSO arcs from NGSO downlink at low latitudes (RR Article 22
 *     Table 22-1B; exact value varies per frequency band + latitude).
 *   - **5%** — Loss-of-availability percentage triggering EPFD
 *     mitigation requirements for protecting GSO ground stations.
 *   - **60 dB** — Out-of-band emission attenuation floor for satellite
 *     uplink earth stations (ITU-R RR Annex 3 / Recommendation SM.1541).
 *
 * Sources (accessed 2026-05-23):
 *   - ITU Radio Regulations, Edition 2024 (in force from 1 Jan 2025)
 *     https://www.itu.int/pub/R-REG-RR
 *   - ITU-R Recommendation S.1503-3 "Functional description to be used
 *     in developing software tools for determining conformity of NGSO
 *     networks with EPFD limits" (2024)
 *     https://www.itu.int/rec/R-REC-S.1503/en
 *   - 47 CFR Part 25 (Satellite Communications)
 *     https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25
 *   - 47 CFR Part 5 (Experimental Radio Service)
 *     https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-5
 *   - 47 CFR Part 97 (Amateur Radio Service)
 *     https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-97
 *   - FCC 22-21 Report and Order on NGSO Spectrum Sharing (May 2022)
 *     https://docs.fcc.gov/public/attachments/FCC-22-21A1.pdf
 *   - Telekommunikationsgesetz (TKG) §§ 91-100 (Frequenzordnung)
 *     https://www.gesetze-im-internet.de/tkg_2021/
 *   - Frequenzverordnung 2024 (BGBl. I 2024)
 *     https://www.bundesnetzagentur.de/DE/Fachthemen/Telekommunikation/Frequenzen/
 *   - Wireless Telegraphy Act 2006 (UK)
 *     https://www.legislation.gov.uk/ukpga/2006/36/contents
 *   - Ofcom Notice of Variation for Earth Stations
 *     https://www.ofcom.org.uk/manage-your-licence/radiocommunication-licences/space/
 *   - UK Space Industry Act 2018 s.8 (in-orbit licence requires spectrum)
 *     https://www.legislation.gov.uk/ukpga/2018/5/section/8
 *   - ANFR — Article L.97-2 du Code des Postes et des Communications
 *     Électroniques (CPCE)
 *     https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033219091
 *   - ARCEP Earth Station Licensing
 *     https://www.arcep.fr/professionnels/licences-frequences.html
 *   - ETSI EN 301 459 v2.1.1 — VSAT harmonised standard
 *     https://www.etsi.org/standards-search#page=1&search=EN%20301%20459
 *   - ETSI EN 301 360 v2.2.1 — S-band earth stations
 *     https://www.etsi.org/standards-search#page=1&search=EN%20301%20360
 *   - ETSI EN 301 428 v3.1.1 — Ku-band earth stations
 *     https://www.etsi.org/standards-search#page=1&search=EN%20301%20428
 *   - ETSI EN 303 645 v2.1.1 — Cyber for consumer IoT (incl. satellite IoT)
 *     https://www.etsi.org/standards-search#page=1&search=EN%20303%20645
 *   - ECC Decision (06)07 "60-66 GHz harmonised use"
 *     https://docdb.cept.org/document/845
 *   - ECC Decision (12)01 "Ka-band downlink sharing"
 *     https://docdb.cept.org/document/1056
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (FCC IBFS, BNetzA frequency-assignment process,
 * Ofcom NoV, ANFR/ARCEP licensing, or ITU BR notification).
 */

/** As-of date for the file as a whole. */
export const SPECTRUM_AS_OF = "2026-05-23";

/** Regime — the regulator or standard-issuer the requirement comes from. */
export type SpectrumRegime =
  | "ITU-RR" // ITU Radio Regulations (international treaty)
  | "FCC-PART-25" // 47 CFR Part 25 (US satellite communications)
  | "FCC-PART-5" // 47 CFR Part 5 (US experimental authorisations)
  | "FCC-PART-97" // 47 CFR Part 97 (US amateur radio satellites)
  | "BNETZA" // German Federal Network Agency
  | "OFCOM-UK" // UK Office of Communications
  | "ANFR-ARCEP" // French spectrum regulators (ANFR + ARCEP)
  | "ETSI" // EU harmonised technical standards
  | "CEPT-ECC"; // European Conference of Postal & Telecommunications Administrations

/** Functional category of a spectrum requirement. */
export type SpectrumRequirementCategory =
  | "FREQUENCY_ALLOCATION" // allocation table compliance (RR Art. 5 etc.)
  | "COORDINATION" // bilateral / multilateral coordination procedures
  | "NOTIFICATION_FILING" // ITU BR notification + recording in MIFR
  | "BRINGING_INTO_USE" // BIU deadline (Res. 32, 7-year rule)
  | "EIRP_LIMITS" // off-axis EIRP density limits
  | "POWER_FLUX_DENSITY" // PFD limits on Earth from space-to-Earth
  | "EPFD_NGSO_LIMITS" // Equivalent Power Flux Density limits for NGSO
  | "OUT_OF_BAND_EMISSIONS" // OOB emission masks + spurious limits
  | "EARTH_STATION_AUTH" // earth-station licensing
  | "ANTENNA_PATTERN_COMPLIANCE" // sidelobe envelope (S.580-6 etc.)
  | "EXPERIMENTAL_LICENSE" // experimental / temporary spectrum use
  | "AMATEUR_BAND_USE" // amateur radio satellite operations
  | "CROSS_POLARIZATION" // X-pol isolation requirements
  | "CYBER_HARDENING" // RF cybersecurity for satellite endpoints
  | "MILESTONE_DEPLOYMENT"; // NGSO constellation milestone progression

/** Spectrum bands of operation. */
export type SpectrumBand =
  | "UHF" // 300 MHz – 3 GHz (Part 97 + UHF amateur)
  | "VHF" // 30 MHz – 300 MHz
  | "L_BAND" // 1 – 2 GHz
  | "S_BAND" // 2 – 4 GHz
  | "C_BAND" // 4 – 8 GHz
  | "X_BAND" // 8 – 12 GHz (government / military)
  | "KU_BAND" // 12 – 18 GHz
  | "KA_BAND" // 26 – 40 GHz
  | "V_BAND" // 40 – 75 GHz
  | "W_BAND" // 75 – 110 GHz
  | "ANY"; // applies across all bands

/** Binding nature — how strict the rule is. */
export type SpectrumBindingNature =
  | "MANDATORY" // Binding rule of law (ITU treaty, FCC, BNetzA, Ofcom)
  | "GUIDELINE" // Non-binding guideline (ITU-R Recommendation, some CEPT)
  | "STANDARD" // Consensus standard (ITU-R technical, some ETSI)
  | "HARMONISED"; // EU-harmonised standard with presumption of conformity

/** Operator scope categories — who the rule applies to. */
export type SpectrumOperatorScope =
  | "COMMERCIAL"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "AMATEUR"
  | "ALL";

/** One entry — a single spectrum requirement from one regime. */
export interface SpectrumRequirementEntry {
  /** Unique code, e.g. "ITU-RR-22-EPFD", "FCC-25.218-EIRP". */
  code: string;

  /** Regulator or standard-issuer. */
  regime: SpectrumRegime;

  /** Functional category. */
  category: SpectrumRequirementCategory;

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

  /** Spectrum bands the rule applies to. */
  applicableBands: ReadonlyArray<SpectrumBand>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "bringingIntoUseYears"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit. */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: SpectrumBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<SpectrumOperatorScope>;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// ITU Radio Regulations (ITU-RR) — International Treaty
// ============================================================================

const ITU_RR_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "ITU-RR-5-ALLOCATION",
    regime: "ITU-RR",
    category: "FREQUENCY_ALLOCATION",
    title: "ITU-RR Article 5 — Frequency allocations table (global band-plan)",
    description:
      "ITU Radio Regulations Article 5 contains the binding global table " +
      "of frequency allocations spanning 8.3 kHz – 3000 GHz, partitioned " +
      "into three Regions (1: Europe/Africa/Middle East; 2: Americas; 3: " +
      "Asia/Pacific). Each allocation specifies whether use is primary or " +
      "secondary, exclusive or shared, with footnotes constraining " +
      "specific services + geographies. All satellite operators must " +
      "demonstrate that their planned operations fall within an allocation " +
      "compatible with their service classification (FSS, MSS, BSS, EESS, " +
      "RNSS, etc.) for each band of interest.",
    effectiveFrom: "2025-01-01",
    citation: "ITU Radio Regulations Article 5",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["ITU-RR-9-COORD", "ITU-RR-11-NOTIFICATION"],
    notes:
      "Edition 2024 of the RR (incorporating WRC-23 results) entered " +
      "into force 1 Jan 2025. The full Table of Frequency Allocations " +
      "is the single most-cited document in satellite licensing.",
  },
  {
    code: "ITU-RR-9-COORD",
    regime: "ITU-RR",
    category: "COORDINATION",
    title: "ITU-RR Article 9 — Coordination procedures between administrations",
    description:
      "ITU-RR Article 9 requires an administration to coordinate any " +
      "satellite network with potentially affected administrations before " +
      "submitting a notification under Article 11. The coordination " +
      "trigger is ΔT/T > 6% (RR Appendix 8) for non-planned bands or " +
      "appearance in coordination footnotes for planned bands. " +
      "Coordination must be completed (or attempted in good faith) before " +
      "the notifying administration may proceed to recording in the " +
      "Master International Frequency Register (MIFR).",
    effectiveFrom: "2025-01-01",
    citation: "ITU Radio Regulations Article 9 + Appendix 8",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["ANY"],
    threshold: {
      parameter: "coordinationTriggerDeltaTOverTPercent",
      operator: "<=",
      value: 6,
      unit: "% ΔT/T",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["ITU-RR-11-NOTIFICATION", "ITU-RR-5-ALLOCATION"],
    notes:
      "ΔT/T = increase in system noise temperature relative to baseline. " +
      "Above 6% the affected administration's services may suffer measurable " +
      "interference, triggering mandatory bilateral coordination.",
  },
  {
    code: "ITU-RR-11-NOTIFICATION",
    regime: "ITU-RR",
    category: "NOTIFICATION_FILING",
    title: "ITU-RR Article 11 — Notification + recording in MIFR",
    description:
      "Following successful Article 9 coordination, the responsible " +
      "administration files a notification under Article 11 with the " +
      "ITU Radiocommunication Bureau (BR). The BR examines the filing " +
      "for conformity with the RR and, if compliant, records the " +
      "assignment in the Master International Frequency Register (MIFR). " +
      "Recording in the MIFR confers international recognition + " +
      "protection of the frequency assignment. Failure to notify, or " +
      "filing a non-conforming notification, blocks the operator from " +
      "international protection of their spectrum use.",
    effectiveFrom: "2025-01-01",
    citation: "ITU Radio Regulations Article 11 §§ 11.2-11.32",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["ITU-RR-9-COORD", "ITU-RR-RES32-BIU"],
  },
  {
    code: "ITU-RR-RES32-BIU",
    regime: "ITU-RR",
    category: "BRINGING_INTO_USE",
    title:
      "ITU-RR Resolution 32 + Art. 11.44 — 7-year bringing-into-use deadline",
    description:
      "ITU-RR Article 11 § 11.44.1 + Resolution 4 (as updated by WRC-23 " +
      "Resolution 32) require that a notified frequency assignment be " +
      "brought into use within 7 years of the date of receipt of the " +
      "Advance Publication Information (API) or notification by the BR. " +
      "Failure to bring into use within 7 years results in suspension or " +
      "cancellation of the assignment by the BR. NGSO constellations face " +
      "additional WRC-23 milestone deployment percentages at 2/5/7 years.",
    effectiveFrom: "2024-01-01",
    citation: "ITU-RR Article 11 § 11.44.1 + Resolution 4 + WRC-23 Res. 32",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["ANY"],
    threshold: {
      parameter: "bringingIntoUseYears",
      operator: "<=",
      value: 7,
      unit: "years from notification",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ITU-RR-11-NOTIFICATION", "ITU-RR-WRC23-MILESTONES"],
    notes:
      "The 7-year clock starts at the BR-recorded notification date. " +
      "Operators commonly use a single test satellite to satisfy BIU; " +
      "after WRC-23 Resolution 32 NGSO constellations must demonstrate " +
      "progressive deployment via milestones.",
  },
  {
    code: "ITU-RR-21-EARTH-TO-SPACE-PFD",
    regime: "ITU-RR",
    category: "POWER_FLUX_DENSITY",
    title: "ITU-RR Article 21 — Power-flux-density limits Earth-to-space",
    description:
      "ITU-RR Article 21 sets binding power-flux-density (PFD) limits at " +
      "Earth's surface from satellite emissions sharing with terrestrial " +
      "services. For uplinks, Article 21 § 21.6 sets terminal EIRP " +
      "limits to protect terrestrial fixed + mobile services in shared " +
      "bands. Specific limits per band are tabulated in Article 21 " +
      "(Tables 21-2 through 21-5). Earth-station applications must " +
      "demonstrate PFD compliance via measurement campaigns or accepted " +
      "ITU-R recommended methodologies.",
    effectiveFrom: "2025-01-01",
    citation: "ITU Radio Regulations Article 21 (Tables 21-2 to 21-5)",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["C_BAND", "X_BAND", "KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["ALL"],
    relatedCodes: ["ITU-RR-22-EPFD-NGSO", "FCC-25.218-EIRP"],
  },
  {
    code: "ITU-RR-22-EPFD-NGSO",
    regime: "ITU-RR",
    category: "EPFD_NGSO_LIMITS",
    title:
      "ITU-RR Article 22 — EPFD limits protecting GSO from NGSO interference",
    description:
      "ITU-RR Article 22 sets binding Equivalent Power Flux Density " +
      "(EPFD) limits for NGSO downlink (EPFDdown), uplink (EPFDup), and " +
      "inter-satellite (EPFDis) emissions. Limits protect GSO networks " +
      "(FSS + BSS) from cumulative NGSO interference and are specified " +
      "in dB(W/m²/MHz) per latitude bin and percentage-of-time. " +
      "WRC-19 + WRC-23 updated the calculation methodology via ITU-R " +
      "Recommendation S.1503-3. NGSO operators must demonstrate EPFD " +
      "compliance via the S.1503 software at API + notification stages.",
    effectiveFrom: "2025-01-01",
    citation: "ITU Radio Regulations Article 22 + Resolution 76",
    sourceUrl: "https://www.itu.int/rec/R-REC-S.1503/en",
    applicableBands: ["KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT"],
    relatedCodes: ["ITU-RR-21-EARTH-TO-SPACE-PFD", "ITU-RR-WRC23-MILESTONES"],
    notes:
      "The EPFD framework is the single most-disputed area of NGSO " +
      "regulation: large constellations (Starlink, Kuiper, OneWeb, " +
      "Telesat) must demonstrate aggregate compliance with the limits, " +
      "not just single-entry compliance.",
  },
  {
    code: "ITU-RR-WRC23-MILESTONES",
    regime: "ITU-RR",
    category: "MILESTONE_DEPLOYMENT",
    title: "WRC-23 Resolution 32 — NGSO milestone deployment percentages",
    description:
      "WRC-23 Resolution 32 introduced a stricter milestone-based BIU " +
      "regime for NGSO constellations. At 2 years from notification the " +
      "operator must have deployed ≥ 10% of the planned constellation; at " +
      "5 years ≥ 50%; at 7 years 100%. Failure to meet a milestone leads " +
      "to proportional reduction of the recorded assignment. This is " +
      "additional to (not replacing) the 7-year BIU rule of Article 11.",
    effectiveFrom: "2024-01-01",
    citation: "WRC-23 Final Acts, Resolution 32",
    sourceUrl: "https://www.itu.int/pub/R-REG-RR",
    applicableBands: ["ANY"],
    threshold: {
      parameter: "milestone7yearDeploymentPercent",
      operator: ">=",
      value: 100,
      unit: "% of notified satellites",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT"],
    relatedCodes: ["ITU-RR-RES32-BIU", "ITU-RR-22-EPFD-NGSO"],
  },
];

// ============================================================================
// FCC Part 25 + Part 5 — US Satellite Spectrum
// ============================================================================

const FCC_PART_25_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "FCC-25-SUBPART-B",
    regime: "FCC-PART-25",
    category: "EARTH_STATION_AUTH",
    title:
      "47 CFR Part 25 Subpart B — Earth-station + space-station applications",
    description:
      "47 CFR Part 25 Subpart B (§§ 25.110 – 25.165) sets the " +
      "application procedures for earth-station and space-station " +
      "authorisations in the FSS, MSS, BSS, ESV, and ESIM services. " +
      "Applications must include: technical showing, frequency + orbit " +
      "coordination evidence, anti-collision + debris showing, and the " +
      "appropriate filing fee. Reviewed by FCC International Bureau on a " +
      "first-come-first-served basis or via processing rounds.",
    effectiveFrom: "1985-10-01",
    citation: "47 CFR § 25.110 – § 25.165",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    applicableBands: ["L_BAND", "S_BAND", "C_BAND", "KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-25-SUBPART-C", "ITU-RR-9-COORD"],
  },
  {
    code: "FCC-25-SUBPART-C",
    regime: "FCC-PART-25",
    category: "OUT_OF_BAND_EMISSIONS",
    title: "47 CFR Part 25 Subpart C — Technical standards + emission masks",
    description:
      "47 CFR Part 25 Subpart C (§§ 25.201 – 25.295) sets the technical " +
      "standards including out-of-band emission masks, off-axis EIRP " +
      "density, cross-polarisation isolation, antenna gain patterns, and " +
      "frequency tolerance. The OOB emission mask for FSS uplinks is " +
      "typically 60 dB attenuation 250% from band edge, per ITU-R " +
      "Recommendation SM.1541.",
    effectiveFrom: "1985-10-01",
    citation: "47 CFR § 25.201 – § 25.295",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    applicableBands: ["S_BAND", "C_BAND", "KU_BAND", "KA_BAND"],
    threshold: {
      parameter: "outOfBandEmissionAttenuationDb",
      operator: ">=",
      value: 60,
      unit: "dB attenuation",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-25-SUBPART-B", "FCC-25.218-EIRP"],
  },
  {
    code: "FCC-25.218-EIRP",
    regime: "FCC-PART-25",
    category: "EIRP_LIMITS",
    title: "47 CFR § 25.218 — Off-axis EIRP density limits (cubesat S-band)",
    description:
      "47 CFR § 25.218 caps off-axis EIRP density for small earth " +
      "stations including cubesat-class operations. For S-band command/" +
      "telemetry, the typical cap is +18 dBW per 4 kHz at the relevant " +
      "off-axis angles to protect adjacent satellites + terrestrial " +
      "services. Operators wishing to exceed the mask must obtain a " +
      "waiver and demonstrate non-interference. Most cubesat licensing " +
      "errors trace to a § 25.218 mask violation.",
    effectiveFrom: "2010-09-01",
    citation: "47 CFR § 25.218",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25/section-25.218",
    applicableBands: ["S_BAND", "X_BAND", "KU_BAND", "KA_BAND"],
    threshold: {
      parameter: "offAxisEirpDensityDbw4kHz",
      operator: "<=",
      value: 18,
      unit: "dBW / 4 kHz",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-25-SUBPART-C", "ITU-RR-21-EARTH-TO-SPACE-PFD"],
  },
  {
    code: "FCC-22-21-NGSO-SHARING",
    regime: "FCC-PART-25",
    category: "COORDINATION",
    title: "FCC 22-21 — NGSO-NGSO spectrum sharing framework",
    description:
      "FCC 22-21 (May 2022) Report and Order established the formal " +
      "framework for NGSO-NGSO spectrum sharing in the US. Operators " +
      "in the same processing round share spectrum on a default-equitable " +
      "basis; operators in different rounds must coordinate, and if " +
      "coordination fails, the default sharing rule is 'band-splitting': " +
      "the spectrum is divided equally between the operators. Applies to " +
      "FSS Ku-, Ka-, and V-band NGSO operations.",
    effectiveFrom: "2022-09-01",
    citation: "FCC 22-21 Report and Order",
    sourceUrl: "https://docs.fcc.gov/public/attachments/FCC-22-21A1.pdf",
    applicableBands: ["KU_BAND", "KA_BAND", "V_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["FCC-25-SUBPART-B", "ITU-RR-22-EPFD-NGSO"],
  },
  {
    code: "FCC-PART-5-EXPERIMENTAL",
    regime: "FCC-PART-5",
    category: "EXPERIMENTAL_LICENSE",
    title: "47 CFR Part 5 — Experimental radio authorisation for satellites",
    description:
      "47 CFR Part 5 (Experimental Radio Service) provides a fast-track " +
      "spectrum authorisation for satellite missions in research, " +
      "development, and demonstration phases. Conventional Part 5 grants " +
      "are limited to 2 years (renewable) and constrain commercial " +
      "operations. Part 5 is often used by university cubesat teams + " +
      "tech-demo missions awaiting Part 25 review. Filing fee is reduced " +
      "and processing is typically 60-90 days vs 6-18 months for Part 25.",
    effectiveFrom: "1985-10-01",
    citation: "47 CFR Part 5 §§ 5.1 – 5.85",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-5",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-25-SUBPART-B"],
    notes:
      "Conventional Part 5 grants exclude commercial revenue-generating " +
      "operations. Market trials require a special permit.",
  },
];

// ============================================================================
// FCC Part 97 — Amateur Radio Satellite Service
// ============================================================================

const FCC_PART_97_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "FCC-97-301-AMATEUR-SAT",
    regime: "FCC-PART-97",
    category: "AMATEUR_BAND_USE",
    title: "47 CFR § 97.207 — Amateur satellite service operations",
    description:
      "47 CFR § 97.207 governs the Amateur Satellite Service in the US. " +
      "Operators must hold a valid amateur radio licence (Technician " +
      "class or higher), must restrict operations to amateur-allocated " +
      "frequency bands (notably VHF 144-148 MHz + UHF 435-438 MHz + " +
      "some HF), and must not transmit commercial communications. The " +
      "primary use-case is cubesat education + experimentation; many " +
      "university missions licence under Part 97 rather than Part 25.",
    effectiveFrom: "1985-10-01",
    citation: "47 CFR § 97.207",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-97/subpart-C/section-97.207",
    applicableBands: ["VHF", "UHF"],
    bindingNature: "MANDATORY",
    operatorScope: ["AMATEUR", "ACADEMIC"],
    relatedCodes: ["FCC-97-COORDINATION"],
    notes:
      "Amateur satellite operations also require coordination through " +
      "IARU (International Amateur Radio Union) frequency coordinator.",
  },
  {
    code: "FCC-97-COORDINATION",
    regime: "FCC-PART-97",
    category: "COORDINATION",
    title: "Part 97 — IARU coordination for amateur satellite frequencies",
    description:
      "Operators of amateur-band satellites must obtain frequency " +
      "coordination from the IARU Satellite Adviser before launch. The " +
      "coordination process verifies that the planned beacon + downlink " +
      "frequencies do not conflict with existing amateur satellites + " +
      "that the bandwidth + emission type fall within amateur band-plan " +
      "norms. Lead time is typically 3-6 months.",
    effectiveFrom: "1985-10-01",
    citation: "47 CFR § 97.207 + IARU Satellite Frequency Coordinator policy",
    sourceUrl: "https://www.iaru.org/on-the-air/satellites/",
    applicableBands: ["VHF", "UHF"],
    bindingNature: "GUIDELINE",
    operatorScope: ["AMATEUR", "ACADEMIC"],
    relatedCodes: ["FCC-97-301-AMATEUR-SAT"],
  },
];

// ============================================================================
// BNetzA — German Federal Network Agency
// ============================================================================

const BNETZA_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "BNETZA-TKG-91",
    regime: "BNETZA",
    category: "EARTH_STATION_AUTH",
    title: "TKG §§ 91-100 — German frequency-assignment regime",
    description:
      "Telekommunikationsgesetz (TKG) §§ 91-100 establish the German " +
      "frequency-assignment regime. Frequency assignments (Frequenzzu­" +
      "teilung) are granted by BNetzA following an application that " +
      "must demonstrate: technical eligibility, frequency-plan " +
      "conformity, non-interference with existing users, and where " +
      "required, ITU-coordinated international compatibility. " +
      "Assignments are typically individual (§ 55 Einzelzu­teilung); " +
      "earth-station VSAT terminals may be covered by a general " +
      "assignment (Allgemeinzu­teilung).",
    effectiveFrom: "2021-12-01",
    citation: "Telekommunikationsgesetz §§ 91-100",
    sourceUrl: "https://www.gesetze-im-internet.de/tkg_2021/",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["BNETZA-FREQVO-2024", "ITU-RR-9-COORD"],
  },
  {
    code: "BNETZA-FREQVO-2024",
    regime: "BNETZA",
    category: "FREQUENCY_ALLOCATION",
    title: "Frequenzverordnung 2024 — German frequency plan",
    description:
      "The Frequenzverordnung 2024 (Frequency Ordinance) consolidates " +
      "the German national frequency plan. It implements the ITU-RR " +
      "allocations table for Region 1 with Germany-specific footnotes " +
      "and earmarks bands for satellite services (FSS, MSS, BSS). All " +
      "BNetzA frequency assignments must conform to the Frequenzverordnung " +
      "and to the relevant Frequenznutzungsplan (technical sub-plan).",
    effectiveFrom: "2024-01-01",
    citation: "Frequenzverordnung BGBl. I 2024",
    sourceUrl:
      "https://www.bundesnetzagentur.de/DE/Fachthemen/Telekommunikation/Frequenzen/",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["BNETZA-TKG-91", "BNETZA-ALLGZUTEILUNG-VSAT"],
  },
  {
    code: "BNETZA-ALLGZUTEILUNG-VSAT",
    regime: "BNETZA",
    category: "EARTH_STATION_AUTH",
    title: "BNetzA Allgemeinzuteilung — General assignment for VSAT terminals",
    description:
      "BNetzA issues Allgemeinzuteilungen (general frequency assignments) " +
      "for classes of low-power earth-station terminals such as Ku-band " +
      "VSAT (Vfg. 18/2024), Ka-band ESIM (Vfg. 22/2024), and L-band " +
      "MSS handheld terminals. Operators in scope of an Allgemeinzu­" +
      "teilung do not need an individual frequency assignment but must " +
      "comply with the published technical parameters (EIRP limits, " +
      "out-of-band emissions, antenna patterns).",
    effectiveFrom: "2024-04-01",
    citation: "BNetzA Vfg. 18/2024 + 22/2024",
    sourceUrl:
      "https://www.bundesnetzagentur.de/DE/Fachthemen/Telekommunikation/Frequenzen/",
    applicableBands: ["L_BAND", "KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["BNETZA-TKG-91", "ETSI-EN-301-459"],
  },
];

// ============================================================================
// Ofcom UK — UK Spectrum Regulator
// ============================================================================

const OFCOM_UK_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "OFCOM-WTA-2006",
    regime: "OFCOM-UK",
    category: "EARTH_STATION_AUTH",
    title: "Wireless Telegraphy Act 2006 — UK earth-station + space licensing",
    description:
      "The Wireless Telegraphy Act 2006 (WTA 2006) is the primary " +
      "statute under which Ofcom issues spectrum licences in the UK. " +
      "Section 8 prohibits use of radio equipment without licence. " +
      "Earth stations are licensed via the Permanent Earth Station " +
      "(PES) or the Earth Station in Motion (ESIM) framework. Satellite " +
      "operators with UK-based ground segments require both the WTA " +
      "licence (for ground equipment) AND a UK SIA 2018 in-orbit " +
      "licence (for the spacecraft itself).",
    effectiveFrom: "2006-11-08",
    citation: "Wireless Telegraphy Act 2006 s. 8",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/2006/36/section/8",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["OFCOM-NOV-EARTH-STATION", "OFCOM-SIA-XREF"],
  },
  {
    code: "OFCOM-NOV-EARTH-STATION",
    regime: "OFCOM-UK",
    category: "EARTH_STATION_AUTH",
    title: "Ofcom Notice of Variation — UK earth-station authorisation",
    description:
      "Ofcom issues a Notice of Variation (NoV) to the standard PES " +
      "licence to authorise specific earth-station-to-satellite " +
      "frequency assignments. The NoV process requires the applicant " +
      "to provide: target satellite identification, beam pointing " +
      "geometry, EIRP + antenna spec, ITU coordination status, and " +
      "interference-non-interference showing. Processing time is " +
      "typically 6-12 weeks.",
    effectiveFrom: "2018-08-01",
    citation: "Ofcom — Earth Station Licensing Notice of Variation procedure",
    sourceUrl:
      "https://www.ofcom.org.uk/manage-your-licence/radiocommunication-licences/space/",
    applicableBands: ["C_BAND", "X_BAND", "KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["OFCOM-WTA-2006", "ITU-RR-9-COORD"],
  },
  {
    code: "OFCOM-SIA-XREF",
    regime: "OFCOM-UK",
    category: "EARTH_STATION_AUTH",
    title: "UK SIA 2018 s.8 — spectrum required for in-orbit licence",
    description:
      "UK Space Industry Act 2018 s. 8 + Spaceflight Activities " +
      "Regulations 2021 (SI 2021/792) require that any application for " +
      "an in-orbit licence include evidence of completed (or pending) " +
      "spectrum coordination. Without ITU coordination + Ofcom WTA " +
      "licence path identified, the UK CAA cannot issue the in-orbit " +
      "spaceflight licence. Cross-reference: SIA assessment is gated on " +
      "spectrum coordination evidence.",
    effectiveFrom: "2021-07-29",
    citation: "UK SIA 2018 s. 8 + SI 2021/792 reg. 10",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/2018/5/section/8",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["OFCOM-WTA-2006", "ITU-RR-11-NOTIFICATION"],
  },
];

// ============================================================================
// ANFR / ARCEP — French Spectrum Regulators
// ============================================================================

const ANFR_ARCEP_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "ANFR-CPCE-L97-2",
    regime: "ANFR-ARCEP",
    category: "FREQUENCY_ALLOCATION",
    title: "Article L.97-2 CPCE — French frequency assignment regime",
    description:
      "Article L.97-2 du Code des Postes et des Communications " +
      "Électroniques (CPCE) is the primary French statute authorising " +
      "ANFR (Agence Nationale des Fréquences) to manage the national " +
      "frequency plan and ARCEP (Autorité de Régulation des " +
      "Communications Électroniques et des Postes) to issue earth-" +
      "station licences. Satellite operators with French ground segments " +
      "must obtain ANFR approval for the frequency assignment + ARCEP " +
      "operator licence.",
    effectiveFrom: "2004-07-09",
    citation: "Code des Postes et des Communications Électroniques L.97-2",
    sourceUrl:
      "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033219091",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "GOVERNMENT", "ACADEMIC"],
    relatedCodes: ["ARCEP-EARTH-STATION", "ITU-RR-9-COORD"],
  },
  {
    code: "ARCEP-EARTH-STATION",
    regime: "ANFR-ARCEP",
    category: "EARTH_STATION_AUTH",
    title: "ARCEP — Earth-station + frequency-use licensing",
    description:
      "ARCEP issues earth-station licences under Article L.42 CPCE for " +
      "operators wishing to operate satellite terminals or gateways on " +
      "French territory. Application requires: technical dossier " +
      "(equipment spec, EIRP, antenna pattern), ANFR frequency-plan " +
      "conformity, ITU coordination evidence (if applicable), and the " +
      "appropriate fee. ARCEP harmonises with ETSI standards for " +
      "presumption of conformity.",
    effectiveFrom: "2004-07-09",
    citation: "Code des Postes et des Communications Électroniques L.42",
    sourceUrl: "https://www.arcep.fr/professionnels/licences-frequences.html",
    applicableBands: ["C_BAND", "KU_BAND", "KA_BAND"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ANFR-CPCE-L97-2", "ETSI-EN-301-459"],
  },
  {
    code: "ANFR-LOI-OPERATIONS-SPATIALES",
    regime: "ANFR-ARCEP",
    category: "EARTH_STATION_AUTH",
    title:
      "French Space Operations Act — spectrum cross-link to operator licence",
    description:
      "Loi n° 2008-518 du 3 juin 2008 (Loi sur les Opérations " +
      "Spatiales) requires that operator-authorisation applications " +
      "include evidence of spectrum coordination + ANFR/ARCEP " +
      "authorisation for any French-territory ground equipment. The " +
      "CNES (Centre National d'Études Spatiales) coordinates the inter-" +
      "ministerial review for spectrum + safety together.",
    effectiveFrom: "2008-12-10",
    citation: "Loi n° 2008-518 + Décret 2009-643",
    sourceUrl: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000018931380",
    applicableBands: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["ANFR-CPCE-L97-2", "ARCEP-EARTH-STATION"],
  },
];

// ============================================================================
// ETSI — EU Harmonised Standards
// ============================================================================

const ETSI_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "ETSI-EN-301-459",
    regime: "ETSI",
    category: "ANTENNA_PATTERN_COMPLIANCE",
    title: "ETSI EN 301 459 — VSAT harmonised standard",
    description:
      "ETSI EN 301 459 v2.1.1 is the EU-harmonised standard for " +
      "Very Small Aperture Terminals (VSAT) earth stations operating in " +
      "the 14/12 GHz Ku-band. It specifies essential requirements: " +
      "antenna sidelobe envelope (compatible with ITU-R S.580-6), " +
      "EIRP density limits, frequency stability, out-of-band emissions, " +
      "and cross-polarisation isolation (≥27 dB on-axis). Compliance " +
      "with EN 301 459 confers presumption of conformity to the Radio " +
      "Equipment Directive (RED 2014/53/EU).",
    effectiveFrom: "2018-05-01",
    citation: "ETSI EN 301 459 v2.1.1",
    sourceUrl:
      "https://www.etsi.org/standards-search#page=1&search=EN%20301%20459",
    applicableBands: ["KU_BAND"],
    threshold: {
      parameter: "crossPolarizationIsolationDb",
      operator: ">=",
      value: 27,
      unit: "dB",
    },
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ETSI-EN-301-428", "ITU-RR-21-EARTH-TO-SPACE-PFD"],
  },
  {
    code: "ETSI-EN-301-360",
    regime: "ETSI",
    category: "ANTENNA_PATTERN_COMPLIANCE",
    title: "ETSI EN 301 360 — S-band earth stations harmonised standard",
    description:
      "ETSI EN 301 360 v2.2.1 is the EU-harmonised standard for fixed " +
      "earth stations operating in the 2.4/2.5 GHz S-band. It specifies " +
      "essential RED requirements: antenna gain pattern, sidelobe " +
      "envelope per ITU-R S.580-6, EIRP density limits, spurious " +
      "emissions, frequency tolerance. Compliance confers presumption " +
      "of conformity to RED 2014/53/EU.",
    effectiveFrom: "2019-04-01",
    citation: "ETSI EN 301 360 v2.2.1",
    sourceUrl:
      "https://www.etsi.org/standards-search#page=1&search=EN%20301%20360",
    applicableBands: ["S_BAND"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ETSI-EN-301-459", "FCC-25.218-EIRP"],
  },
  {
    code: "ETSI-EN-301-428",
    regime: "ETSI",
    category: "ANTENNA_PATTERN_COMPLIANCE",
    title: "ETSI EN 301 428 — Ku-band earth stations harmonised standard",
    description:
      "ETSI EN 301 428 v3.1.1 is the EU-harmonised standard for fixed " +
      "earth stations operating in the 14/12 GHz Ku-band FSS uplink " +
      "(separately from VSAT scope of EN 301 459). It specifies " +
      "essential RED requirements: antenna sidelobe envelope, EIRP " +
      "density, spurious emissions, on-axis cross-polarisation ≥27 dB. " +
      "Compliance confers presumption of conformity to RED 2014/53/EU.",
    effectiveFrom: "2020-09-01",
    citation: "ETSI EN 301 428 v3.1.1",
    sourceUrl:
      "https://www.etsi.org/standards-search#page=1&search=EN%20301%20428",
    applicableBands: ["KU_BAND"],
    threshold: {
      parameter: "crossPolarizationIsolationDb",
      operator: ">=",
      value: 27,
      unit: "dB",
    },
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ETSI-EN-301-459", "ANFR-CPCE-L97-2"],
  },
  {
    code: "ETSI-EN-303-645",
    regime: "ETSI",
    category: "CYBER_HARDENING",
    title: "ETSI EN 303 645 — Cyber security for satellite IoT endpoints",
    description:
      "ETSI EN 303 645 v2.1.1 is the EU baseline cybersecurity standard " +
      "for consumer IoT devices including satellite-IoT endpoints. As of " +
      "the RED Delegated Act 2024/202 (effective Aug 2025), EN 303 645 " +
      "compliance is the presumed conformity path for the Article 3.3 " +
      "(d, e, f) RED cybersecurity essential requirements. Satellite IoT " +
      "operators offering devices into the EU market must comply or " +
      "demonstrate equivalent security.",
    effectiveFrom: "2025-08-01",
    citation: "ETSI EN 303 645 v2.1.1 + RED Delegated Act 2024/202",
    sourceUrl:
      "https://www.etsi.org/standards-search#page=1&search=EN%20303%20645",
    applicableBands: ["L_BAND", "S_BAND", "KU_BAND"],
    bindingNature: "HARMONISED",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ETSI-EN-301-360"],
    notes:
      "EN 303 645 was originally a voluntary IoT security standard; it " +
      "became EU-binding through the RED Delegated Act in 2024 with a " +
      "transition period ending Aug 2025.",
  },
];

// ============================================================================
// CEPT/ECC — European Conference of Postal and Telecommunications Administrations
// ============================================================================

const CEPT_ECC_ENTRIES: ReadonlyArray<SpectrumRequirementEntry> = [
  {
    code: "CEPT-ECC-06-07",
    regime: "CEPT-ECC",
    category: "FREQUENCY_ALLOCATION",
    title: "ECC Decision (06)07 — 60-66 GHz harmonised satellite use",
    description:
      "ECC Decision (06)07 designates the 60-66 GHz V-band for " +
      "harmonised non-licensed and lightly-licensed use across CEPT " +
      "member countries including FSS earth-to-space + space-to-Earth " +
      "applications. National regulators (BNetzA, Ofcom, ANFR, etc.) " +
      "implement the Decision via national general assignments. The " +
      "Decision specifies EIRP limits, channel raster, and out-of-band " +
      "constraints.",
    effectiveFrom: "2006-12-01",
    citation: "ECC Decision (06)07",
    sourceUrl: "https://docdb.cept.org/document/845",
    applicableBands: ["V_BAND"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["BNETZA-FREQVO-2024", "OFCOM-NOV-EARTH-STATION"],
    notes:
      "CEPT/ECC decisions are non-binding on member countries but are " +
      "typically transposed into national general assignments to enable " +
      "pan-European single-market spectrum use.",
  },
  {
    code: "CEPT-ECC-12-01",
    regime: "CEPT-ECC",
    category: "POWER_FLUX_DENSITY",
    title: "ECC Decision (12)01 — Ka-band downlink PFD sharing rules",
    description:
      "ECC Decision (12)01 sets harmonised power-flux-density (PFD) " +
      "limits at Earth for the 17.3-20.2 GHz Ka-band downlink to " +
      "protect terrestrial fixed services. The Decision adopts ITU-RR " +
      "Article 21 PFD limits as the European baseline and tightens them " +
      "in specific sub-bands (17.7-19.7 GHz) where dense terrestrial " +
      "fixed-service deployment exists in Europe.",
    effectiveFrom: "2012-06-01",
    citation: "ECC Decision (12)01",
    sourceUrl: "https://docdb.cept.org/document/1056",
    applicableBands: ["KA_BAND"],
    bindingNature: "GUIDELINE",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["ITU-RR-21-EARTH-TO-SPACE-PFD", "ETSI-EN-301-459"],
  },
  {
    code: "CEPT-ECC-REPORT-271",
    regime: "CEPT-ECC",
    category: "EPFD_NGSO_LIMITS",
    title: "ECC Report 271 — Ka-band NGSO/GSO compatibility studies",
    description:
      "ECC Report 271 (2018) documents the compatibility study between " +
      "NGSO FSS systems and incumbent GSO networks in the Ka-band " +
      "(17.3-20.2 GHz downlink + 27.5-30.0 GHz uplink). It provides the " +
      "European technical basis for assessing aggregate EPFD compliance " +
      "under ITU-RR Article 22. National regulators reference Report 271 " +
      "when evaluating NGSO operator applications + the resulting " +
      "coordination demands on incumbent GSO operators.",
    effectiveFrom: "2018-03-01",
    citation: "ECC Report 271",
    sourceUrl: "https://docdb.cept.org/document/271",
    applicableBands: ["KA_BAND"],
    bindingNature: "STANDARD",
    operatorScope: ["COMMERCIAL", "GOVERNMENT"],
    relatedCodes: ["ITU-RR-22-EPFD-NGSO", "FCC-22-21-NGSO-SHARING"],
  },
];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All spectrum / ITU coordination requirements across all regimes. */
export const SPECTRUM_REQUIREMENTS: ReadonlyArray<SpectrumRequirementEntry> = [
  ...ITU_RR_ENTRIES,
  ...FCC_PART_25_ENTRIES,
  ...FCC_PART_97_ENTRIES,
  ...BNETZA_ENTRIES,
  ...OFCOM_UK_ENTRIES,
  ...ANFR_ARCEP_ENTRIES,
  ...ETSI_ENTRIES,
  ...CEPT_ECC_ENTRIES,
];

/** Coverage metadata. */
export const SPECTRUM_COVERAGE = {
  totalEntries: SPECTRUM_REQUIREMENTS.length,
  byRegime: {
    "ITU-RR": SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "ITU-RR").length,
    "FCC-PART-25": SPECTRUM_REQUIREMENTS.filter(
      (e) => e.regime === "FCC-PART-25",
    ).length,
    "FCC-PART-5": SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "FCC-PART-5")
      .length,
    "FCC-PART-97": SPECTRUM_REQUIREMENTS.filter(
      (e) => e.regime === "FCC-PART-97",
    ).length,
    BNETZA: SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "BNETZA").length,
    "OFCOM-UK": SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "OFCOM-UK")
      .length,
    "ANFR-ARCEP": SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "ANFR-ARCEP")
      .length,
    ETSI: SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "ETSI").length,
    "CEPT-ECC": SPECTRUM_REQUIREMENTS.filter((e) => e.regime === "CEPT-ECC")
      .length,
  },
  asOf: SPECTRUM_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findSpectrumEntry(
  code: string,
): SpectrumRequirementEntry | undefined {
  return SPECTRUM_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findSpectrumByRegime(
  regime: SpectrumRegime,
): ReadonlyArray<SpectrumRequirementEntry> {
  return SPECTRUM_REQUIREMENTS.filter((entry) => entry.regime === regime);
}

/** Find all entries for a given category. */
export function findSpectrumByCategory(
  category: SpectrumRequirementCategory,
): ReadonlyArray<SpectrumRequirementEntry> {
  return SPECTRUM_REQUIREMENTS.filter((entry) => entry.category === category);
}

/**
 * Find all entries that apply to a given spectrum band.
 * "ANY" rules apply across all bands; specific-band rules return only when matched.
 */
export function findSpectrumByBand(
  band: SpectrumBand,
): ReadonlyArray<SpectrumRequirementEntry> {
  return SPECTRUM_REQUIREMENTS.filter(
    (entry) =>
      entry.applicableBands.includes(band) ||
      entry.applicableBands.includes("ANY"),
  );
}

/** Find all entries by binding nature. */
export function findSpectrumByBindingNature(
  bindingNature: SpectrumBindingNature,
): ReadonlyArray<SpectrumRequirementEntry> {
  return SPECTRUM_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/** Find all entries that have a quantitative threshold. */
export function findSpectrumWithThreshold(): ReadonlyArray<SpectrumRequirementEntry> {
  return SPECTRUM_REQUIREMENTS.filter((entry) => entry.threshold !== undefined);
}

/**
 * Find mandatory spectrum requirements applicable to a specific jurisdiction.
 * Maps jurisdiction ISO-2 codes to the regimes that bind operators there.
 * ITU-RR is the international treaty layer and binds operators in every
 * country; national regimes layer on top.
 */
export function findMandatorySpectrumForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<SpectrumRequirementEntry> {
  const jurisdictionRegimes: Record<string, ReadonlyArray<SpectrumRegime>> = {
    US: ["ITU-RR", "FCC-PART-25", "FCC-PART-5", "FCC-PART-97"],
    GB: ["ITU-RR", "OFCOM-UK", "ETSI", "CEPT-ECC"],
    UK: ["ITU-RR", "OFCOM-UK", "ETSI", "CEPT-ECC"],
    DE: ["ITU-RR", "BNETZA", "ETSI", "CEPT-ECC"],
    FR: ["ITU-RR", "ANFR-ARCEP", "ETSI", "CEPT-ECC"],
    IT: ["ITU-RR", "ETSI", "CEPT-ECC"],
    ES: ["ITU-RR", "ETSI", "CEPT-ECC"],
    NL: ["ITU-RR", "ETSI", "CEPT-ECC"],
    BE: ["ITU-RR", "ETSI", "CEPT-ECC"],
    SE: ["ITU-RR", "ETSI", "CEPT-ECC"],
    PL: ["ITU-RR", "ETSI", "CEPT-ECC"],
    AT: ["ITU-RR", "ETSI", "CEPT-ECC"],
    FI: ["ITU-RR", "ETSI", "CEPT-ECC"],
    DK: ["ITU-RR", "ETSI", "CEPT-ECC"],
    CH: ["ITU-RR", "ETSI", "CEPT-ECC"],
    NO: ["ITU-RR", "ETSI", "CEPT-ECC"],
    JP: ["ITU-RR"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return SPECTRUM_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) && entry.bindingNature === "MANDATORY",
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
