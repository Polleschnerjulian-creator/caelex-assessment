/**
 * Canada origin module (Spec 2026-06-13 §4.2, M-CA) — the GEP / US-exemption /
 * individual-permit determination for an exporter seated in Canada (CA).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a CA-seated exporter, Canadian export-control law is the Export and Import
 * Permits Act (EIPA, R.S.C. 1985, c. E-19) + the Export Control List (ECL,
 * SOR/89-202), administered by Global Affairs Canada (Trade and Export Controls
 * Bureau — the Export Controls Division; the operational units EPMB/TIE). EIPA
 * s.13 prohibits exporting any ECL good except under an export permit. The ECL
 * Group 1 = the Wassenaar dual-use list under a Canadian cover; its item numbers
 * (e.g. "1-9.A.4.") map one-to-one to the bare multilateral / EU Annex I codes
 * (9A004), which `ca-ecl.ts` mirrors. The general permits are the GENERAL EXPORT
 * PERMITS (GEPs, regulations under EIPA); the individual licence is an individual
 * export permit at Global Affairs Canada. This module decides, for a given
 * classified item × destination:
 *   • item not CA-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled AND a verified general permit covers item×destination →
 *     GENERAL/GO under that permit (with its conditions), authority = GAC.
 *   • controlled + no general permit covers it → INDIVIDUAL/REVIEW = individual
 *     export permit at Global Affairs Canada (TIE/EPMB).
 *
 * ─── The two general-permit paths modelled (curated from the official source) ─
 *
 * (A) THE UNITED-STATES EXEMPTION — the load-bearing CA-US integration. Most ECL
 * items are controlled by the Guide "to all destinations OTHER THAN the United
 * States", so a controlled export to a FINAL CONSIGNEE in the US is EXEMPT from
 * an export permit (Export Controls Handbook: "in most cases, controlled exports
 * to final consignees in the United States are exempt from permit requirements";
 * for cryptography specifically: "Permits are not required to export cryptography
 * and information security goods or technology from Canada to the United States").
 * This is BROADER than GEP No. 41 — it even covers the crypto 1-5.A.2 that GEP-41
 * excludes. BUT it is NOT universal: the Handbook table "ECL Items that require
 * permits for export to the United States" lists the NON-exempt items — Group 2
 * munitions (2-1/2-2.a/2-2.b/2-3/2-4.a), ALL of Groups 3 & 4 (nuclear), parts of
 * Group 5, GROUP 6 MTCR (6-1/6-2) and Group 7 (7-3/7-13). So a Group-6/MTCR
 * space-launch item (9A004/9A106-class) is NOT US-exempt — it fail-closes via the
 * sensitive floor below, even to the US.
 *
 * (B) GENERAL EXPORT PERMIT No. 41 (SOR/2015-200) "Dual-use Goods and Technology
 * to Certain Destinations" — for the non-US allies. s.2 authorizes export of any
 * Group-1 dual-use good of the Guide to 32 ELIGIBLE DESTINATIONS (the EU-22 listed
 * + IS/NO/CH/GB/US/AU/NZ/JP/KR/TR). s.3 EXCLUDES: destinations on the Area Control
 * List / SEMA-UN-sanctioned (s.3(1)); the ~46 items on the SCHEDULE (s.3(2)(b) —
 * incl. item 13 = "1-5.A.2." cryptography, plus various Cat-6/Cat-9 sensors and
 * Cat-9 software/technology); items outside Group 1 (s.3(2)); and — crucially —
 * goods "intended for the development, production or use of rocket systems or
 * unmanned aerial vehicles with a range of 300 km or greater" (s.3(2)(e), the
 * MTCR end-use catch-all). Conditions (s.4/s.5): annual registration with the
 * Export Controls Division before first use, a six-monthly report, six-year
 * record retention.
 *
 * The crypto GEPs No. 45 (development/production) and No. 46 (use by certain
 * consignees), and the per-applicant individual permits, require per-shipment /
 * per-consignee facts this destination/item-only input cannot establish → they
 * are NOT auto-granted here; their non-coverage falls through to the INDIVIDUAL/
 * REVIEW default (the operator can still apply). This keeps every GO this module
 * emits backed by a permit whose item×destination eligibility IS determinable
 * (the US exemption, or GEP No. 41 minus its Schedule/MTCR exclusions).
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (no false-CLEARED, §4.5) ────────────────
 * The most-sensitive MTCR/Annex-IV-equivalent dual-use codes (9A004 space launch
 * vehicles, 9A106.c thrust-vector control, the wider 9A1xx / 7A1xx / 6A1xx
 * families) are the space-launch items the Canadian scheme controls under ECL
 * GROUP 6 (MTCR) and that GEP-41 s.3(2)(e) excludes (rocket systems ≥300 km) and
 * the Handbook lists as NOT US-exempt (6-1/6-2). They are NOT confirmable as
 * permit-eligible from the official text → they FAIL-CLOSE to an individual
 * export permit (REVIEW) for EVERY destination, including the US. Canada
 * transposes the IDENTICAL international control lists (Wassenaar/MTCR/NSG/AG) as
 * the EU/UK, so the SAFETY FLOOR reuses the EXACT EU/UK-verified exclusion set
 * (EU 2021/821 Annex II Section I = retained Reg 428/2009 Annex IIg, byte-
 * identical): "all items in Annex IV" + the 13 explicit codes, plus the fail-
 * closed bare-PARENT guard. This is a SAFETY floor (never a guessed GO), reused
 * because Canada controls the same multilateral items the EU/UK exclude. So
 * golden sat-bus (9A004) and apogee-engine (9A106) correctly STAY REVIEW for
 * every CA destination incl. the US.
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * For a CA seat, `dualUsePrimary = CA_ECL`, `militaryPrimary = null`. Until M-CA
 * the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a CA-seat
 * controlled export (REGIME_MATURITY CA_ECL = 3). M-CA lifts it to 2 and
 * registers this module; Gate 4.5 stops firing for CA. The module's GENERAL/GO
 * supersedes the generic Gate-3.5 (`ACTUAL_CODE_DECLARED`) / Gate-4 BAFA REVIEW
 * for the SAME dual-use leg (the wiring removes those generic rows on a GENERAL
 * verdict). A CA→US non-sensitive item (US-exempt) and a CA→GEP-41-destination
 * non-sensitive non-crypto item therefore become GO; a sensitive Annex-IV-
 * equivalent item (9A004/9A106), crypto to a non-US destination, or a CA→non-US/
 * non-eligible (IN/CN) export stays REVIEW (individual permit). Hard destination
 * prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM and are NEVER
 * reached here as GO — the wiring skips this module when a hard prohibition
 * already blocks (Canada applies RU/BY sanctions via SEMA; Gate 1.6 keeps a
 * CA→RU controlled dual-use export BLOCKED). An item bearing a US ECCN (eccnUS)
 * also carries an independent US/BIS leg the module does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://laws-lois.justice.gc.ca/eng/acts/E-19/index.html — Export and Import Permits Act (R.S.C. 1985, c. E-19), s.13
 * @see https://laws-lois.justice.gc.ca/eng/regulations/SOR-89-202/FullText.html — Export Control List (SOR/89-202); Group 1 dual-use, Group 6 MTCR
 * @see https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-200/FullText.html — General Export Permit No. 41 (Dual-use Goods and Technology to Certain Destinations): s.2 destinations, s.3 exclusions (incl. s.3(2)(e) ≥300 km MTCR end-use), the Schedule (item 13 = 1-5.A.2 cryptography), s.4/s.5 conditions
 * @see https://www.international.gc.ca/controls-controles/export-exportation/exp_ctr_handbook-manuel_ctr_exp-p2.aspx?lang=eng — Export Controls Handbook: US permit-exemption + the table of ECL items that DO require a permit to the US (Group 2/3/4/6 MTCR/7)
 * @see https://www.international.gc.ca/controls-controles/export-exportation/crypto/Crypto_Intro.aspx?lang=eng — cryptography: no permit to the US; GEP No. 45/46 for other destinations
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";
import { evaluateGeneralLicence } from "./types";

/** The issuing/competent authority for Canadian strategic export controls. */
const CA_AUTHORITY = "Global Affairs Canada (TIE/EPMB)";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_EIPA =
  "https://laws-lois.justice.gc.ca/eng/acts/E-19/index.html — Export and Import Permits Act (R.S.C. 1985, c. E-19), s.13 (export-permit requirement for ECL goods)";
const SRC_ECL =
  "https://laws-lois.justice.gc.ca/eng/regulations/SOR-89-202/FullText.html — Export Control List (SOR/89-202): Group 1 dual-use (= Wassenaar list, codes byte-compatible with EU Annex I), Group 6 MTCR";
const SRC_GEP41 =
  "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-200/FullText.html — General Export Permit No. 41 (Dual-use Goods and Technology to Certain Destinations): s.2 (32 eligible destinations), s.3 (exclusions incl. s.3(2)(e) rocket systems ≥300 km + the Schedule, item 13 = 1-5.A.2 cryptography), s.4/s.5 (registration, 6-monthly report, 6-year records)";
const SRC_US_EXEMPTION =
  "https://www.international.gc.ca/controls-controles/export-exportation/exp_ctr_handbook-manuel_ctr_exp-p2.aspx?lang=eng — Export Controls Handbook: controlled exports to final consignees in the United States are in most cases exempt from a permit (most ECL items are controlled 'to all destinations other than the United States'); the table of items that STILL require a permit to the US lists Group 2 munitions, Groups 3/4 nuclear, parts of Group 5, GROUP 6 MTCR (6-1/6-2) and Group 7 (7-3/7-13)";
const SRC_CRYPTO_US =
  "https://www.international.gc.ca/controls-controles/export-exportation/crypto/Crypto_Intro.aspx?lang=eng — Global Affairs Canada: 'Permits are not required to export cryptography and information security goods or technology from Canada to the United States'; GEP No. 45/46 for other destinations (development-/consignee-specific)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; Canada transposes the same lists,
 * and the Canadian scheme controls the missile/space-launch family under ECL
 * Group 6 (MTCR) + GEP-41 s.3(2)(e)). The no-false-CLEARED safety-floor source.
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Canada mirrors via Wassenaar/MTCR/NSG/AG and controls under ECL Group 6 + GEP-41 s.3(2)(e)); used as the no-false-CLEARED safety floor for the GEP/US-exemption paths";

/** Permit freshness as-of (verification date against SOR/2015-200 + the Guide). */
export const CA_PERMIT_AS_OF = "2026-06-13";

/**
 * GEP No. 41 eligible destinations — SOR/2015-200 s.2, VERBATIM, as ISO-2.
 *
 * Australia (AU), Austria (AT), Belgium (BE), Czechia (CZ), Denmark (DK),
 * Estonia (EE), Finland (FI), France (FR), Germany (DE), Greece (GR), Hungary
 * (HU), Iceland (IS), Ireland (IE), Italy (IT), Japan (JP), Latvia (LV),
 * Lithuania (LT), Luxembourg (LU), Netherlands (NL), New Zealand (NZ), Norway
 * (NO), Poland (PL), Portugal (PT), Republic of Korea (KR), Slovakia (SK),
 * Slovenia (SI), Spain (ES), Sweden (SE), Switzerland (CH), Türkiye (TR), the
 * United Kingdom (GB), the United States (US).
 *
 * NOTE: India (IN), China (CN) and Russia (RU) are NOT eligible. The US is also
 * a listed GEP-41 destination, but the broader, permit-FREE US exemption is the
 * operative (and stronger) path for CA→US — see `caOriginModule`.
 */
export const CA_GEP41_DESTINATIONS: ReadonlySet<string> = new Set([
  "AU",
  "AT",
  "BE",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "JP",
  "LV",
  "LT",
  "LU",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "KR",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "GB",
  "US",
]);

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Canada transposes the identical Wassenaar/MTCR/NSG/AG
 * lists, so the SAME most-sensitive codes that the EU/UK exclude from their self-
 * executing general licences are the ones the Canadian general permits + the US
 * exemption cannot be confirmed to cover → fail-close. Stored normalised
 * (UPPERCASE). The matcher (`matchesCode`) is sub-precise: `9A009.A` excludes
 * only the .a branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts.
 */
const CA_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
  "0C001", // natural/depleted uranium or thorium
  "0C002", // special fissile materials (other than the most-sensitive)
  "0D001", // software for Cat-0 goods
  "0E001", // technology for Cat-0 goods
  "1A102", // resaturated pyrolised carbon-carbon for 9A004/9A104
  "1C351", // human/animal pathogens and "toxins"
  "1C353", // genetic elements and GMOs
  "1C354", // plant pathogens
  "1C450.A.1", // Amiton + alkylated/protonated salts
  "1C450.A.2", // PFIB
  "7E104", // technology for flight-management trajectory optimisation
  "9A009.A", // hybrid rocket propulsion systems > 1.1 MNs (ONLY .a, NOT 9A009.b)
  "9A117", // staging/separation mechanisms and interstages usable in "missiles"
];

/**
 * Sensitive-exclusion floor — PART (1): the Annex-IV-equivalent member set.
 *
 * The most-sensitive MTCR/Annex-IV list. Canada mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/NSG/AG) and controls the missile/space-
 * launch family under ECL Group 6 (MTCR) + the GEP-41 s.3(2)(e) ≥300 km
 * end-use exclusion + the Handbook's "requires a permit to the US" table. The
 * member codes below mirror the EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly.
 * Where Annex IV lists a SUB-item of a parent, BOTH the precise sub-code AND its
 * bare parent stem are listed: a declared bare parent (e.g. "9A106") cannot be
 * cleanly confirmed to sit OUTSIDE the sensitive sub-item, so it fail-closes
 * (§4.5). This is why golden 9A004 (sat-bus) and 9A106 (apogee-engine) correctly
 * STAY REVIEW for a CA seat — even to the US.
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (a Cat-0
 * nuclear item is never general-permit-eligible anyway — nuclear goods are ECL
 * Groups 3/4 and require a permit even to the US per the Handbook table).
 */
const CA_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
  // Category 0 (NSG) — whole category. Stem-match = safe.
  "0",
  // Category 1 — Annex-IV-equivalent members (stealth + strategic + NSG).
  "1A007", // detonator firing sets / explosive detonators
  "1B226", // electromagnetic isotope separators
  "1B231", // tritium facilities
  "1B233", // lithium isotope separation
  "1C001", // EM-absorbing / intrinsically conductive polymers (stealth)
  "1C012", // 1C012.b previously-separated neptunium-237 (bare parent → fail-closed)
  "1C101", // reduced-observables materials/devices (stealth)
  "1C233", // lithium-6 enriched
  "1C235", // tritium/tritium compounds
  "1C239", // high explosives (strategic)
  "1D103", // software for reduced-observables analysis
  "1E001", // technology for 1C012.b
  "1E101", // technology for 1C101/1D103
  "1E102", // technology for 1D103 software
  "1E201", // technology for 1B226/1B231/1B233/1C233/1C235 (+ 1C239)
  // Category 3 — Annex-IV-equivalent members (strategic + NSG).
  "3A228", // switching devices (cold-cathode / spark-gaps)
  "3A229", // high-current pulse generators
  "3A231", // neutron generator systems
  "3A232", // multipoint initiation systems
  "3E201", // technology for 3A228/3A229/3A231/3A232
  // Category 5 part 2 — Annex-IV-equivalent cryptanalysis members. Bare parents too.
  "5A004.A", // cryptanalytic equipment
  "5A004", // bare parent → fail-closed
  "5D002.A.3", // software for 5A004.a/.b
  "5D002.C.3", // software functioning as 5A004.a/.b
  "5D002", // bare parent → fail-closed
  "5E002.A", // technology for 5A004.a / 5D002.a.3 / 5D002.c.3
  "5E002", // bare parent → fail-closed
  // Category 6 — Annex-IV-equivalent members (acoustics + radar XS + NSG).
  "6A001", // acoustics (multiple sub-items) — stem-match = safe
  "6A203", // streak/framing cameras
  "6A225", // velocity interferometers
  "6A226", // pressure sensors
  "6B008", // pulse radar cross-section systems
  "6B108", // radar XS systems usable for missiles
  "6D003.A", // software for real-time acoustic-data processing
  "6D003", // bare parent → fail-closed
  // Category 7 — Annex-IV-equivalent MTCR-technology members.
  "7A117", // guidance sets usable in missiles
  "7B001", // test/cal/alignment equipment for 7A117
  "7B003", // production equipment for 7A117
  "7B103", // production facilities for 7A117
  "7D101", // software for 7B003/7B103
  "7E001", // technology for 7A117/7B003/7B103/7D101 development
  "7E002", // technology for 7A117/7B003/7B103 production
  "7E101", // technology for 7A117/7B003/7B103/7D101 use
  // Category 8 — Annex-IV-equivalent members.
  "8A002.O.3", // noise-reduction systems for vessels ≥1000 t
  "8A002", // bare parent → fail-closed
  "8E002.A", // technology for underwater-noise-reduction propellers
  "8E002", // bare parent → fail-closed
  // Category 9 — Annex-IV-equivalent MTCR-technology members. CRITICAL: 9A004
  // (space launch vehicles) + 9A106.c (thrust-vector control) are HERE — golden
  // sat-bus/apogee stay fail-closed REVIEW. Bare parents listed where a sub-item.
  "9A004", // space launch vehicles (≥500 kg / ≥300 km)
  "9A005", // liquid rocket propulsion systems
  "9A007.A", // solid rocket propulsion systems
  "9A007", // bare parent → fail-closed
  "9A008.D", // movable-nozzle / fluid-injection TVC components
  "9A008", // bare parent → fail-closed
  "9A104", // sounding rockets (≥500 kg / ≥300 km)
  "9A105.A", // liquid-propellant rocket engines
  "9A105", // bare parent → fail-closed
  "9A106.C", // thrust-vector control sub-systems
  "9A106", // bare parent → fail-closed (apogee-engine golden item)
  "9A108.C", // thrust-vector control sub-systems (solid)
  "9A108", // bare parent → fail-closed
  "9A116", // reentry vehicles + equipment therefor
  "9A119", // individual rocket stages
  "9B115", // production equipment for 9A005/9A007.a/… stages
  "9B116", // production facilities for 9A004 + the 9A005/… family
  "9D101", // software for 9B116
  "9E001", // technology for 9A004/9A005/…/9B116/9D101 development
  "9E002", // technology for 9A004/9A005/…/9B116 production
  "9E101", // technology for 9A104/9A105.a/9A106.c/9A108.c/9A116/9A119
  "9E102", // technology for the 9A004/… launch-vehicle family use
];

/**
 * GEP No. 41 SCHEDULE exclusions — the space-relevant subset (SOR/2015-200,
 * the ~46-item Schedule + the s.3(2)(e) MTCR end-use catch-all).
 *
 * Item 13 of the Schedule = "those referred to in item 1-5.A.2. of the Guide"
 * (cryptography / information security = ECCN 5A002). The rest of the Schedule
 * (advanced Cat-6 sensors, Cat-9 software/technology, Cat-1 composites etc.) is
 * largely a SUPERSET of the sensitive floor already modelled above — items like
 * 1-9.A.11./1-9.D.1./1-9.D.2./1-9.E.x and the Cat-6 sub-items are MTCR/Annex-IV-
 * equivalent and already fail-close via `CA_ANNEX_IV_EQUIV_PREFIXES`. The codes
 * listed HERE are the GEP-41-Schedule items NOT otherwise on the sensitive floor
 * that the space slice can realistically carry — chiefly the crypto carve-out.
 * Listing crypto explicitly keeps GEP-41 honest (5A002 is GEP-41-excluded) while
 * the US exemption (path A) still clears CA→US crypto (its own, broader basis).
 */
const CA_GEP41_SCHEDULE_EXCLUDED_PREFIXES: readonly string[] = [
  "5A002", // GEP-41 Schedule item 13 (1-5.A.2 cryptography / information security)
];

/** Normalise a declared code for prefix comparison (uppercase, trimmed). */
function normCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/**
 * Does the normalised declared `code` match `pattern`?
 *
 * Match when `code` equals `pattern` OR is a sub-code of it (next char is a `.`
 * boundary). Sub-precise: `9A009.A` matches `9A009.A`/`9A009.A.1` but NOT
 * `9A009.AB`/`9A009.B`; bare `1C351` matches `1C351`/`1C351.D.4`; the Cat-0 `0`
 * stem matches any `0...` code. The boundary check (not a raw `startsWith`)
 * prevents `9A106` from spuriously matching `9A1060` while catching `9A106.c`.
 */
function matchesCode(code: string, pattern: string): boolean {
  if (code === pattern) return true;
  if (!code.startsWith(pattern)) return false;
  // Single-char category stems ("0") match the whole category — no boundary.
  if (pattern.length === 1) return true;
  const next = code.charAt(pattern.length);
  return next === ".";
}

/**
 * Fail-closed bare-PARENT guard. A declared code that is a strict PARENT of a
 * more-specific excluded sub-code (bare `9A009` over the excluded `9A009.A`, or
 * bare `1C450` over `1C450.A.1`/`1C450.A.2`) cannot be cleanly confirmed to be
 * the NON-excluded sibling — the bare code SPANS both the excluded and the
 * eligible sub-items, so a GO would be a guess.
 *
 * This is load-bearing: the Canadian ECL Group 1 (= Wassenaar dual-use list,
 * mirrored in `ca-ecl.ts` as "1-9.A.9." → 9A009) classifies hybrid rocket motors
 * as the BARE `9A009` (no .a/.b split). Without this guard a 9A009.a-class motor
 * (>1.1 MNs — the sensitive MTCR variant) declared as bare `9A009` would wrongly
 * clear: a false-CLEARED on rocket propulsion. So a bare parent fail-closes
 * (§4.5). A TRUE sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any
 * excluded code, so it is unaffected and stays permit-eligible. Expects a
 * normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    CA_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    CA_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (NOT general-permit-eligible to ANY
 * destination, including the US)?
 *   PART (1) the Annex-IV-equivalent set — `CA_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `CA_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the CA corpus's bare `9A009` over `9A009.a`).
 *
 * This floor is the no-false-CLEARED safety position: the most-sensitive MTCR/
 * Annex-IV-equivalent codes (Canada's ECL Group 6 / GEP-41 s.3(2)(e) / not-US-
 * exempt) are NOT confirmable as permit-eligible → individual export permit.
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    CA_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    CA_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/** Is `code` on the GEP-41 Schedule exclusion (e.g. crypto 5A002)? */
function isGep41ScheduleExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return CA_GEP41_SCHEDULE_EXCLUDED_PREFIXES.some((p) => matchesCode(c, p));
}

/**
 * The CA-controlled dual-use code carried by a classification, if any.
 * CA control attaches via a declared `eccnEU` (the ECL Group 1 = Wassenaar
 * dual-use list, byte-identical to EU Annex I — `ca-ecl.ts` mirrors it) OR a
 * declared non-EAR99 `eccnUS` (the CCL mirror of the same dual-use item Canada
 * transposes). Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is a US control handled by the upstream ITAR gate
 * and is never general-permit-eligible.
 */
function caControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * The UNITED-STATES EXEMPTION as a `GeneralLicence` for the generic evaluator.
 * `eligibleCodes` = the item carries a CA-controlled code that is NOT on the
 * sensitive floor (the not-US-exempt Group-6 MTCR / nuclear / Annex-IV-equivalent
 * codes). Crypto IS US-exempt, so it is NOT excluded here (only the sensitive
 * floor bites). `eligibleDestinations` = { US } only. No destination-specific
 * exclusions beyond the single allow-destination.
 */
export const CA_US_EXEMPTION: GeneralLicence = {
  id: "CA_US_EXEMPTION",
  label:
    "US permit exemption — ECL goods controlled 'to all destinations other than the United States' are permit-exempt to a US final consignee (Export Controls Handbook)",
  authority: CA_AUTHORITY,
  eligibleCodes: (c) => {
    const code = caControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream
    return !isSensitiveExcluded(code);
  },
  eligibleDestinations: new Set<string>(["US"]),
  excludedDestinations: new Set<string>(),
  conditions: [
    "Gilt nur für Ausfuhren an einen Endempfänger (final consignee) in den USA; eine Weiterleitung/Re-Export an ein anderes Land ist nicht von der US-Befreiung gedeckt.",
    "Aufzeichnungen über die Ausfuhr führen und aufbewahren; bei Zweifeln an der ECL-Einstufung oder am US-Endverbleib die Export Controls Division von Global Affairs Canada konsultieren.",
    "Die Befreiung deckt NICHT die ausdrücklich permit-pflichtigen Positionen (ECL Group 2 Munitions, Groups 3/4 Nuklear, Teile von Group 5, GROUP 6 MTCR, Teile von Group 7) — für diese ist auch in die USA eine Einzelgenehmigung erforderlich.",
  ],
  citation: SRC_US_EXEMPTION,
  asOfDate: CA_PERMIT_AS_OF,
};

/**
 * GENERAL EXPORT PERMIT No. 41 as a `GeneralLicence` for the generic evaluator.
 * `eligibleCodes` = the item carries a CA-controlled Group-1 dual-use code that
 * is NOT on the sensitive floor AND NOT on the GEP-41 Schedule (crypto 5A002 is
 * Schedule item 13). `eligibleDestinations` = the s.2 eligible-destination set.
 * `excludedDestinations` is empty (the destination logic is the positive
 * allow-list; the s.3(1) Area-Control-List / SEMA-UN exclusions are decided
 * UPSTREAM by the engine's hard-prohibition gates, which run before this module).
 */
export const CA_GEP_41: GeneralLicence = {
  id: "CA_GEP_41",
  label:
    "General Export Permit No. 41 (SOR/2015-200) — Dual-use Goods and Technology to Certain Destinations (Global Affairs Canada)",
  authority: CA_AUTHORITY,
  eligibleCodes: (c) => {
    const code = caControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream
    return !isSensitiveExcluded(code) && !isGep41ScheduleExcluded(code);
  },
  eligibleDestinations: CA_GEP41_DESTINATIONS,
  excludedDestinations: new Set<string>(),
  conditions: [
    "Vor der ersten Nutzung im Kalenderjahr Namen/Anschrift/Kontaktdaten schriftlich bei der Export Controls Division von Global Affairs Canada registrieren (GEP No. 41, s.4).",
    "Innerhalb von 30 Tagen nach jedem Sechsmonatszeitraum (endend am 31. Januar / 31. Juli) einen Bericht über die getätigten Ausfuhren einreichen (GEP No. 41, s.4).",
    "Aufzeichnungen zu jeder Ausfuhr/Verbringung sechs Jahre lang aufbewahren (GEP No. 41, s.5).",
    "Keine Nutzung für Güter, die für die Entwicklung/Produktion/Nutzung von Raketensystemen oder UAVs mit ≥ 300 km Reichweite bestimmt sind (GEP No. 41, s.3(2)(e), MTCR-Endverwendungs-Catch-all); Ziel darf nicht auf der Area Control List / SEMA-UN-sanktioniert sein (s.3(1)).",
  ],
  citation: SRC_GEP41,
  asOfDate: CA_PERMIT_AS_OF,
};

/**
 * All curated CA general licences (space-relevant): the US permit exemption +
 * GEP No. 41. Order matters — the US exemption is evaluated FIRST so a CA→US
 * crypto export (US-exempt but GEP-41-Schedule-excluded) resolves to the US
 * exemption rather than falling through. See the file header for why the crypto
 * GEP No. 45/46 and the individual permits are not auto-granted here.
 */
export const CA_GENERAL_LICENCES: readonly GeneralLicence[] = [
  CA_US_EXEMPTION,
  CA_GEP_41,
];

/**
 * Canada `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not CA-controlled → NONE/GO.
 *   2. CA-controlled + a general permit covers item×destination → GENERAL/GO
 *      (the US exemption for CA→US non-sensitive items, or GEP No. 41 for a
 *      non-sensitive non-crypto item to a listed destination), authority = GAC.
 *   3. CA-controlled + no general permit covers it → INDIVIDUAL/REVIEW =
 *      individual export permit at Global Affairs Canada (TIE/EPMB).
 *
 * There is no member→NCA resolution (Global Affairs Canada is the single
 * authority), so `exporterSeat` is not consulted; authority is always GAC.
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Canada applies the
 * RU/BY sanctions via SEMA; Gate 1.6 keeps CA→RU controlled dual-use BLOCKED).
 */
export const caOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = caControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Canadian export control → no CA licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: CA_AUTHORITY,
      reasons: [
        "Gut trägt keinen kanadischen Kontrollcode (Export Control List Group 1 dual-use, = Wassenaar-Liste) — keine kanadische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_ECL],
    };
  }

  // 2. CA-controlled + a general permit covers item×destination → GENERAL/GO.
  //    Evaluated in CA_GENERAL_LICENCES order: US exemption first, then GEP-41.
  const covering = CA_GENERAL_LICENCES.find((lic) =>
    evaluateGeneralLicence(lic, classification, destinationCountry),
  );
  if (covering) {
    const pathReason =
      covering.id === "CA_US_EXEMPTION"
        ? `Ausfuhr an einen Endempfänger in den USA: die meisten ECL-Güter sind nur „to all destinations other than the United States" kontrolliert — kein Permit erforderlich (US-Befreiung; bei Kryptografie ausdrücklich „no permit required to the United States").`
        : `${dest} ist eine GEP-No.-41-berechtigte Bestimmung (SOR/2015-200 s.2) und ${code} steht weder auf dem GEP-41-Schedule noch auf der sensiblen MTCR/Anhang-IV-Liste — die Allgemeingenehmigung greift, kein Einzelantrag nötig, sofern die Auflagen (Registrierung, Berichte, Aufzeichnungen) erfüllt sind.`;
    return {
      outcome: "GO",
      licenceType: "GENERAL",
      authority: CA_AUTHORITY,
      generalLicence: {
        id: covering.id,
        label: covering.label,
        conditions: covering.conditions,
      },
      reasons: [
        `Kanadisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${pathReason}`,
      ],
      citations:
        covering.id === "CA_US_EXEMPTION"
          ? [SRC_EIPA, SRC_US_EXEMPTION, SRC_CRYPTO_US]
          : [SRC_EIPA, SRC_ECL, covering.citation],
    };
  }

  // 3. CA-controlled + no general permit covers it → INDIVIDUAL/REVIEW =
  //    individual export permit at Global Affairs Canada (TIE/EPMB).
  //    Reasons differ by why no permit applied:
  //      • the code is on the sensitive floor (Group-6 MTCR / Annex-IV-equiv —
  //        9A004/9A106 — not US-exempt, not GEP-41-eligible: fail-closed §4.5);
  //      • the code is GEP-41-Schedule-excluded (crypto 5A002) AND the
  //        destination is not the US (crypto GEP No. 45/46 are consignee-/
  //        development-specific, not auto-grantable);
  //      • the destination is neither the US nor a GEP-41 eligible state.
  const sensitive = isSensitiveExcluded(code);
  const scheduleExcl = isGep41ScheduleExcluded(code);
  let reasonDetail: string;
  if (sensitive) {
    reasonDetail = `Code ${code} ist ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut (Kanada kontrolliert die Raketen-/Trägerraketen-Familie unter ECL Group 6 (MTCR) bzw. GEP-41 s.3(2)(e) ≥ 300 km; solche Positionen sind laut Handbook auch in die USA permit-pflichtig). Eine Allgemeingenehmigungs-Deckung ist nicht eindeutig bestätigbar — fail-closed (§4.5, kein false-CLEARED).`;
  } else if (scheduleExcl) {
    reasonDetail = `Code ${code} (Kryptografie, 1-5.A.2) steht auf dem GEP-No.-41-Schedule (Item 13) und ist für ${dest} von keiner automatisch erteilbaren Allgemeingenehmigung gedeckt (die Krypto-GEP No. 45/46 sind entwicklungs-/empfänger-spezifisch). Für die USA gälte die separate US-Befreiung — ${dest} ist jedoch nicht die USA.`;
  } else {
    reasonDetail = `${dest} ist weder die USA (US-Befreiung) noch eine GEP-No.-41-berechtigte Bestimmung (SOR/2015-200 s.2); GEP No. 41 ist eine positive Bestimmungsland-Allowlist.`;
  }
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: CA_AUTHORITY,
    reasons: [
      `Kanadisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Einzelausfuhrgenehmigung bei Global Affairs Canada (Export Controls Division, TIE/EPMB) erforderlich.`,
    ],
    citations: sensitive
      ? [SRC_EIPA, SRC_ECL, SRC_US_EXEMPTION, SRC_SENSITIVE_FLOOR]
      : scheduleExcl
        ? [SRC_EIPA, SRC_GEP41, SRC_CRYPTO_US]
        : [SRC_EIPA, SRC_ECL, SRC_GEP41],
  };
};
