/**
 * Japan origin module (Spec 2026-06-13 §4.2, M-JP) — the General Bulk Export
 * Licence + individual-licence determination for an exporter seated in Japan
 * (JP).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a JP-seated exporter, Japanese export-control law is the Foreign Exchange
 * and Foreign Trade Act (FEFTA, 外国為替及び外国貿易法) with the control list
 * published as the Export Trade Control Order (輸出貿易管理令, "ETCO"),
 * administered by METI (Ministry of Economy, Trade and Industry). A JP-origin
 * dual-use export needs a Japanese licence in its own right. Japan transposes
 * the SAME international control lists (Wassenaar/MTCR/NSG/AG) as the EU — its
 * Schedule 1 codes are byte-compatible with EU Annex I (`9A004`, `5A002`, …;
 * see `src/data/trade/japan-meti.ts`). The general licence is the General Bulk
 * Export Licence (ippan houkatsu kyoka, 一般包括許可); the individual licence is
 * an individual export licence (kobetsu kyoka). This module decides, for a
 * given classified item × destination:
 *   • item not JP-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled AND the bulk licence covers item×destination → GENERAL/GO under
 *     the General Bulk Licence (with its CP/registration conditions),
 *     authority = METI.
 *   • controlled + no bulk licence covers it → INDIVIDUAL/REVIEW = individual
 *     export licence at METI.
 *
 * ─── Which general licence is modelled (curated from the official source) ──
 * The General Bulk Export Licence (一般包括許可, "ippan houkatsu kyoka"). It
 * covers the export of certain listed dual-use items to the "Group A" countries
 * (グループA国 — formerly the "white countries", listed in Appended Table 3 /
 * List No.3 of the Export Trade Control Order), without a per-shipment
 * individual licence, provided the exporter operates a METI-approved Internal
 * Compliance Program (CP) and observes the licence's record-keeping / catch-all
 * conditions. (METI also issues a parallel Special General Bulk Export Licence
 * to a wider destination set under stricter exporter conditions; it is exporter-
 * specific and not auto-grantable from item×destination alone — like the EU's
 * EU002-008 / the Swiss AGB — so it is NOT modelled here; its non-coverage falls
 * through to the INDIVIDUAL/REVIEW default, which the operator can still claim.)
 *
 * The Group A set is the Export Trade Control Order Appended Table 3 list,
 * VERBATIM (27 states): Argentina, Australia, Austria, Belgium, Bulgaria,
 * Canada, Czech Republic, Denmark, Finland, France, Germany, Greece, Hungary,
 * Ireland, Italy, Luxembourg, Netherlands, New Zealand, Norway, Poland,
 * Portugal, Spain, Sweden, Switzerland, United Kingdom, United States + South
 * Korea. CRITICAL: South Korea (KR) was REMOVED from Group A in Aug 2019 and
 * RESTORED effective 21 July 2023 (Cabinet Order promulgated 30 June 2023) — it
 * IS a Group-A destination at the 2026-06-13 as-of. India (IN) is NOT on the
 * list. A JP→non-Group-A dual-use export needs an individual licence.
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (no false-CLEARED, §4.5) ────────────────
 * The General Bulk Licence covers only certain listed items to Group A; the
 * most-sensitive items (incl. sensitive MTCR items) are NOT bulk-eligible and
 * require an individual licence. ENGLISH-SOURCE HONESTY (§4.5, the M-KR/M-JP
 * mandate): the PRECISE per-row item-eligibility exclusion schedule of the bulk
 * licence (which Schedule-1 rows/sub-items are bulk-eligible vs carved out) is
 * set by METI ministerial notices that are NOT cleanly verifiable in the
 * official English translation. Reading "bulk covers Group A" literally would
 * make EVERY dual-use code (incl. 9A004 space launch vehicles and 9A106.c
 * thrust-vector control) bulk-eligible to a Group-A state — a false-CLEARED on
 * MTCR space-launch tech, which is CATASTROPHIC and forbidden (§4.5).
 *
 * RESOLUTION (over-strict-but-safe, identical to the M-CH precedent): the most-
 * sensitive MTCR/Annex-IV-equivalent codes are NOT confirmable as bulk-eligible
 * from the official English source, so they FAIL-CLOSE to an individual licence
 * (REVIEW). Japan transposes the IDENTICAL international control lists the EU/UK
 * do (Wassenaar/MTCR/NSG/AG), so the SAFETY FLOOR reuses the EXACT EU/UK-verified
 * exclusion set (EU 2021/821 Annex II Section I = retained Reg 428/2009 Annex
 * IIg, byte-identical): "all items in Annex IV" + the 13 explicit codes, plus
 * the fail-closed bare-PARENT guard. This is a SAFETY floor (never a guessed
 * GO), NOT a claim that METI publishes this exact exclusion schedule — it is the
 * honest "cannot confirm in official English → REVIEW" position the M-JP mandate
 * requires for 9A004/9A106. So golden sat-bus (9A004) and apogee-engine (9A106)
 * correctly STAY REVIEW for every JP destination.
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * For a JP seat, `dualUsePrimary = JP_METI`, `militaryPrimary = null`. Until
 * M-JP the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a
 * JP-seat controlled export (REGIME_MATURITY JP_METI = 3). M-JP lifts it to 2
 * and registers this module; Gate 4.5 stops firing for JP. The module's
 * GENERAL/GO supersedes the generic Gate-3.5 (`ACTUAL_CODE_DECLARED`) / Gate-4
 * BAFA REVIEW for the SAME dual-use leg (the wiring removes those generic rows
 * on a GENERAL verdict). A JP→Group-A bulk-eligible item therefore becomes GO; a
 * sensitive Annex-IV-equivalent item or a JP→non-Group-A (IN/CN) export stays
 * REVIEW (individual licence). Hard destination prohibitions (embargo / RU-BY /
 * ITAR) are decided UPSTREAM and are NEVER reached here as GO — the wiring skips
 * this module when a hard prohibition already blocks (Japan applies RU/BY
 * sanctions; Gate 1.6 keeps a JP→RU controlled dual-use export BLOCKED). An item
 * bearing a US ECCN (eccnUS) also carries an independent US/BIS leg the module
 * does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.meti.go.jp/english/policy/external_economy/trade_control/index.html — METI Trade Control hub (FEFTA + Export Trade Control Order; bulk licences + Group A)
 * @see https://www.meti.go.jp/english/press/2023/0627_004.html — METI press release (2023-06-27): South Korea added to Appended Table 3 (Group A), enforced 21 July 2023
 * @see https://www.meti.go.jp/policy/anpo/law_document/tutatu/t01sch.pdf — Export Trade Control Order Schedule 1 (goods control list; byte-compatible with EU Annex I via Wassenaar/MTCR)
 * @see https://www.japaneselawtranslation.go.jp — official English provisional translations (FEFTA / Ministerial Order); precise bulk-licence item-exclusion schedule not cleanly rendered → English-source-honesty safety floor (§4.5)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";
import { evaluateGeneralLicence } from "./types";

/** The issuing/competent authority for Japanese strategic export controls. */
const JP_AUTHORITY = "METI";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_METI_HUB =
  "https://www.meti.go.jp/english/policy/external_economy/trade_control/index.html — METI Trade Control hub (FEFTA + Export Trade Control Order; bulk licences + Group A)";
const SRC_GROUP_A =
  "https://www.meti.go.jp/english/press/2023/0627_004.html — METI press release (2023-06-27): South Korea added to Export Trade Control Order Appended Table 3 (Group A), enforced 21 July 2023; the Group-A list is the bulk-licence destination set";
const SRC_SCHEDULE_1 =
  "https://www.meti.go.jp/policy/anpo/law_document/tutatu/t01sch.pdf — Export Trade Control Order Schedule 1 (goods control list, byte-compatible with EU Annex I via Wassenaar/MTCR)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; Japan transposes the same lists).
 * This is the SAFETY-floor source for the no-false-CLEARED position, NOT a claim
 * that METI publishes this exact bulk-licence exclusion schedule (English-source
 * honesty, §4.5).
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Japan mirrors via Wassenaar/MTCR/NSG/AG); used as the no-false-CLEARED safety floor for the General Bulk Licence — the precise METI bulk-licence item-exclusion schedule is not cleanly verifiable in official English (English-source honesty, §4.5)";

/** Bulk-licence freshness as-of (verification date). */
export const JP_GENERAL_BULK_AS_OF = "2026-06-13";

/**
 * Group A destinations — Export Trade Control Order Appended Table 3 (List
 * No.3), as ISO-2. The General Bulk Export Licence destination set.
 *
 * Argentina (AR), Australia (AU), Austria (AT), Belgium (BE), Bulgaria (BG),
 * Canada (CA), Czech Republic (CZ), Denmark (DK), Finland (FI), France (FR),
 * Germany (DE), Greece (GR), Hungary (HU), Ireland (IE), Italy (IT),
 * Luxembourg (LU), Netherlands (NL), New Zealand (NZ), Norway (NO), Poland (PL),
 * Portugal (PT), Spain (ES), Sweden (SE), Switzerland (CH), United Kingdom (GB),
 * United States (US) + South Korea (KR).
 *
 * NOTE: South Korea (KR) was REMOVED in Aug 2019 and RESTORED effective 21 July
 * 2023 (Cabinet Order promulgated 30 June 2023) — it IS Group A at the
 * 2026-06-13 as-of. India (IN) is NOT on the list. A JP→non-Group-A dual-use
 * export needs an individual export licence at METI.
 */
export const JP_GROUP_A_DESTINATIONS: ReadonlySet<string> = new Set([
  "AR",
  "AU",
  "AT",
  "BE",
  "BG",
  "CA",
  "CZ",
  "DK",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LU",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "ES",
  "SE",
  "CH",
  "GB",
  "US",
  "KR", // restored to Group A, enforced 21 July 2023
]);

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Japan transposes the identical Wassenaar/MTCR/NSG/AG
 * lists, so the SAME most-sensitive codes that the EU/UK exclude from their self-
 * executing general licences are the ones the Japanese General Bulk Licence
 * cannot be confirmed (in official English) to cover → fail-close. Stored
 * normalised (UPPERCASE) for comparison. The matcher (`matchesCode`) is sub-
 * precise: `9A009.A` excludes only the .a branch (NOT .b); `1C450.A.1`/
 * `1C450.A.2` only those two salts (NOT bare 1C450).
 */
const JP_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. Japan mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/NSG/AG), so the member codes below mirror
 * the EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly. Where Annex IV lists a SUB-item
 * of a parent, BOTH the precise sub-code AND its bare parent stem are listed: a
 * declared bare parent (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE
 * the sensitive sub-item, so it fail-closes (§4.5). This is why golden 9A004
 * (sat-bus) and 9A106 (apogee-engine) correctly STAY REVIEW for a JP seat.
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (a Cat-0
 * nuclear item is never bulk-eligible anyway — nuclear material/equipment is the
 * most-sensitive end of the NSG list).
 */
const JP_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
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
 * This is load-bearing: the Japan METI Schedule 1 (= EU Annex I, mirrored in
 * `japan-meti.ts`) classifies hybrid rocket motors as the BARE `9A009` (no .a/.b
 * split). Without this guard a 9A009.a-class motor (>1.1 MNs — the sensitive
 * MTCR variant) declared as bare `9A009` would wrongly clear under the bulk
 * licence: a false-CLEARED on rocket propulsion. So a bare parent fail-closes
 * (§4.5). A TRUE sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any
 * excluded code, so it is unaffected and stays bulk-eligible. Expects a
 * normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    JP_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    JP_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (NOT bulk-eligible)?
 *   PART (1) the Annex-IV-equivalent set — `JP_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `JP_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the JP corpus's bare `9A009` over `9A009.a`).
 *
 * This floor is the no-false-CLEARED safety position for the General Bulk
 * Licence (the precise METI bulk-licence item-exclusion schedule is not cleanly
 * verifiable in official English) — the most-sensitive MTCR/Annex-IV-equivalent
 * codes are NOT confirmable as bulk-eligible → individual licence (§4.5).
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    JP_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    JP_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The JP-controlled dual-use code carried by a classification, if any.
 * JP control attaches via a declared `eccnEU` (the Japan METI Schedule 1 is
 * byte-compatible with EU Annex I) OR a declared non-EAR99 `eccnUS` (which, in
 * this corpus, is the Wassenaar/CCL mirror of the same dual-use item Japan
 * transposes). Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is a US control handled by the upstream ITAR gate
 * and is never bulk-eligible.
 */
function jpControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * The General Bulk Export Licence as a `GeneralLicence` for the generic
 * evaluator. `eligibleCodes` = the item carries a JP-controlled code that is NOT
 * on the sensitive-exclusion floor. `eligibleDestinations` = the Group-A set.
 * There are no destination-specific exclusions beyond the allow-set (the bulk
 * licence is a positive Group-A allow-list), so `excludedDestinations` is empty.
 */
export const JP_GENERAL_BULK: GeneralLicence = {
  id: "JP_GENERAL_BULK",
  label:
    "General Bulk Export Licence (一般包括許可, ippan houkatsu kyoka) — METI general bulk licence to Group A",
  authority: JP_AUTHORITY,
  eligibleCodes: (c) => {
    const code = jpControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream, not via the bulk licence
    return !isSensitiveExcluded(code);
  },
  eligibleDestinations: JP_GROUP_A_DESTINATIONS,
  excludedDestinations: new Set<string>(),
  conditions: [
    "Ein von METI anerkanntes innerbetriebliches Compliance-Programm (CP, internal compliance program) betreiben — Voraussetzung für die Nutzung der General Bulk Export Licence.",
    "Aufzeichnungs- und Meldepflichten der Sammelgenehmigung einhalten (Belege je Ausfuhr aufbewahren; etwaige METI-Meldungen).",
    "Keine Nutzung, wenn der Exporteur weiss oder Grund zur Annahme hat, dass die Güter für WMD-/Trägerwaffen-Zwecke bestimmt sind, oder wenn METI eine 'Inform'-/Einzelgenehmigungspflicht mitteilt (FEFTA Catch-All; seit 9. Okt. 2025 auch für Group-A-Ziele auf METI-Mitteilung).",
  ],
  citation: SRC_GROUP_A,
  asOfDate: JP_GENERAL_BULK_AS_OF,
};

/** All curated JP general licences (space-relevant). Currently the General Bulk
 * Export Licence — see the file header for why the Special General Bulk Licence
 * is not auto-granted here (exporter-specific). */
export const JP_GENERAL_LICENCES: readonly GeneralLicence[] = [JP_GENERAL_BULK];

/**
 * Japan `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not JP-controlled → NONE/GO.
 *   2. JP-controlled + the bulk licence covers item×destination → GENERAL/GO
 *      under the General Bulk Export Licence (authority METI).
 *   3. JP-controlled + no bulk licence covers it → INDIVIDUAL/REVIEW = individual
 *      export licence at METI.
 *
 * There is no member→NCA resolution (METI is the single Japanese authority), so
 * `exporterSeat` is not consulted; authority is always "METI".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Japan applies RU/BY
 * sanctions; Gate 1.6 keeps a JP→RU controlled dual-use export BLOCKED).
 */
export const jpOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = jpControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Japanese dual-use control → no JP licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: JP_AUTHORITY,
      reasons: [
        "Gut trägt keinen japanischen Dual-Use-Kontrollcode (Export Trade Control Order Schedule 1, FEFTA) — keine japanische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_METI_HUB, SRC_SCHEDULE_1],
    };
  }

  // 2. JP-controlled + the bulk licence covers item×destination → GENERAL/GO.
  const covering = JP_GENERAL_LICENCES.find((lic) =>
    evaluateGeneralLicence(lic, classification, destinationCountry),
  );
  if (covering) {
    return {
      outcome: "GO",
      licenceType: "GENERAL",
      authority: JP_AUTHORITY,
      generalLicence: {
        id: covering.id,
        label: covering.label,
        conditions: covering.conditions,
      },
      reasons: [
        `Japanisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: die General Bulk Export Licence (一般包括許可) greift — ${dest} ist ein Group-A-Staat (Export Trade Control Order Anlage 3) —, kein Einzelantrag nötig, sofern die Auflagen erfüllt sind (anerkanntes METI-CP, Aufzeichnungspflichten).`,
      ],
      citations: [SRC_METI_HUB, covering.citation],
    };
  }

  // 3. JP-controlled + no bulk licence covers it → INDIVIDUAL/REVIEW = individual
  //    export licence at METI. Either the destination is NOT a Group-A state (so
  //    the General Bulk Licence does not apply, and the Special General Bulk
  //    Licence is exporter-specific — not auto-grantable), or the code is on the
  //    sensitive-exclusion floor (the most-sensitive MTCR/Annex-IV-equivalent
  //    codes — e.g. 9A004/9A106.c — which are not confirmable as bulk-eligible in
  //    official English and fail-close, §4.5).
  const excluded = isSensitiveExcluded(code);
  const reasonDetail = excluded
    ? `Code ${code} ist ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut; eine Deckung durch die General Bulk Export Licence ist aus der amtlichen englischen Quelle nicht eindeutig bestätigbar — fail-closed (§4.5, kein false-CLEARED).`
    : `${dest} ist KEIN Group-A-Staat (Export Trade Control Order Anlage 3); die General Bulk Export Licence greift nur für Group-A-Ziele, und die Special General Bulk Export Licence ist exporteur-spezifisch und hier nicht automatisch erteilbar.`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: JP_AUTHORITY,
    reasons: [
      `Japanisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Einzelausfuhrgenehmigung (kobetsu kyoka) bei METI erforderlich.`,
    ],
    citations: excluded
      ? [SRC_METI_HUB, SRC_SCHEDULE_1, SRC_SENSITIVE_FLOOR]
      : [SRC_METI_HUB, SRC_GROUP_A],
  };
};
