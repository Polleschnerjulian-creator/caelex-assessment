/**
 * EU origin module (Spec 2026-06-13 §4.2, M-EU) — the EUGEA + member-NCA
 * licence determination for an exporter seated in an EU-27 member state.
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For an EU-seated exporter, EU export law is union-wide uniform on substance
 * (Reg (EU) 2021/821: Annex I control list + Annex II Union General Export
 * Authorisations "EUGEA" EU001–EU008); only the issuing/competent authority
 * (NCA) differs per member state (resolved from `exporterSeat` via
 * `eu-member-nca.ts`). This module decides, for a given classified item ×
 * destination:
 *   • item not EU-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled AND a EUGEA covers item×destination → GENERAL/GO under that
 *     EUGEA (with its conditions), authority = the member NCA.
 *   • controlled + no EUGEA covers it → INDIVIDUAL/REVIEW at the member NCA.
 *
 * ─── Which EUGEA is modelled (curated from the official source) ────────────
 * EU001 (Reg (EU) 2021/821 Annex II, Part I, EU001) — the friendly-destination
 * GL: export of dual-use items in any Annex I entry, EXCEPT those listed in the
 * Annex II "Section I" exclusion list, to AU/CA/IS/JP/NZ/NO/CH(+LI)/GB/US.
 * Conditions: registration with the NCA before first use + customs declaration
 * "EU001" + the WMD/missile/military-embargo end-use catch-all (Part 3).
 *
 * The Section I EXCLUSION list is "the list referred to in point (a) of
 * Article 12(6)" set out in Annex II Section I (Reg (EU) 2021/821, OJ L 206,
 * 11.6.2021, p. 443). It has EXACTLY two parts (verbatim from the OJ text,
 * cross-verified against the BAFA Annex II republication — both agree byte-for-
 * byte):
 *   (1) "all items specified in Annex IV" (Reg (EU) 2021/821 Annex IV, the most-
 *       sensitive intra-Union-transfer list, OJ L 206 p. 449–456); and
 *   (2) a short EXPLICIT code list: 0C001, 0C002, 0D001, 0E001, 1A102, 1C351,
 *       1C353, 1C354, 1C450.a.1, 1C450.a.2, 7E104, 9A009.a, 9A117.
 * An EU-controlled item whose code falls in EITHER part — or whose Section-I
 * status cannot be cleanly determined (e.g. a bare parent code whose Annex IV
 * sub-item overlaps) — is NOT EU001-eligible: INDIVIDUAL/REVIEW at the NCA
 * (fail-closed §4.5, NO guessed GO).
 *
 * NOTE (corrected 2026-06-13, M-EU): the prior curation listed ~42 prefixes on
 * a stale Reg 428/2009 Annex IIg basis (conflating the EU003/EU007 lists + the
 * whole 9A004/9A005-9A011/9A101-9A119/9D101-9D104/9E101-9E102 MTCR family). The
 * exact 2021/821 Section I list above does NOT exclude e.g. 9A101/9A102/9A103/
 * 9A107/9A109/9A110/9A111/9A115/9A118, 9D102-9D104, 5A001.f/.j, 1A002, 1C227-
 * 1C240, 1C350, 1C352 or the bare 1C450 — those are off Section I and EU001-
 * eligible to friendly destinations. CRITICALLY, however, 9A004 (space launch
 * vehicles) AND 9A106.c (thrust-vector control) ARE in Annex IV (Part I, MTCR
 * technology) — so they STAY Section-I-excluded via clause (1); the correction
 * does NOT loosen them (fail-closed confirmed against the OJ Annex IV text).
 *
 * The other EUGEAs (EU002 low-value, EU003 after-repair, EU004 temporary,
 * EU005 telecom, EU007 intra-group tech, EU008 cybersurveillance) require
 * per-shipment facts (value, prior-export linkage, return window, group
 * structure) that this destination/item-only input cannot establish → they are
 * NOT auto-granted here; their non-coverage simply falls through to the
 * INDIVIDUAL/REVIEW default (the operator can still claim them manually). EU006
 * (chemicals) is out of space scope. This keeps every GO this module emits
 * backed by a EUGEA whose item×destination eligibility IS determinable (EU001).
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * The generic engine Gate 3.5 (declared EU dual-use ECCN → BAFA REVIEW for a
 * known non-EU destination) and Gate 4 (heuristic EU codes → BAFA REVIEW) fire
 * for EU-controlled items. This module REFINES that: where EU001 clearly covers
 * the item×destination, the verdict is GENERAL/GO-under-EU001 INSTEAD of the
 * generic REVIEW. The wiring in `license-determination.ts` supersedes the
 * generic EU-dual-use REVIEW requirements with this module's GO (only for a
 * GENERAL verdict, and NEVER over a hard-prohibition BLOCK — embargo / RU-BY /
 * Annex-IV / ITAR stay BLOCKED upstream of this module).
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821
 * @see https://www.bafa.de/SharedDocs/Downloads/EN/Foreign_Trade/afk_eu_dual-use_reg_annex_ii.pdf — Annex II (EUGEA), consolidated by BAFA
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";
import { evaluateGeneralLicence } from "./types";
import { resolveEuMemberNca } from "./eu-member-nca";
import { EU27_MEMBER_STATES } from "../eu-member-states";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_REG =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821";
const SRC_ANNEX_II =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex II EU001 + Section I (OJ L 206, 11.6.2021, p. 443); cross-verified vs. BAFA Annex II republication";
/** Reg (EU) 2021/821 Annex IV — the most-sensitive intra-Union-transfer list. */
const SRC_ANNEX_IV =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (OJ L 206, 11.6.2021, p. 449)";

/** EUGEA freshness as-of. */
export const EU_EUGEA_AS_OF = "2026-06-13";

/**
 * EU001 destinations (Reg 2021/821 Annex II, EU001 Part 2), ISO-2.
 * Australia, Canada, Iceland, Japan, New Zealand, Norway, Switzerland
 * (including Liechtenstein), United Kingdom, United States.
 */
export const EU001_DESTINATIONS: ReadonlySet<string> = new Set([
  "AU",
  "CA",
  "IS",
  "JP",
  "NZ",
  "NO",
  "CH",
  "LI", // Liechtenstein, explicitly included with Switzerland
  "GB",
  "US",
]);

/**
 * EU001 Section I exclusion — PART (2): the EXPLICIT code list.
 *
 * "The list referred to in point (a) of Article 12(6)" set out in Reg (EU)
 * 2021/821 Annex II Section I (OJ L 206, 11.6.2021, p. 443), VERBATIM. These 13
 * codes are listed in addition to "all items specified in Annex IV" (modelled
 * separately below). Cross-verified against the BAFA Annex II republication —
 * both official sources agree byte-for-byte.
 *
 * Stored normalised (UPPERCASE) for comparison; each entry is the EXACT code as
 * published, including its sub-suffix where the OJ specifies one. The matcher
 * (`matchesCode`) is sub-precise: an explicit `9A009.A` excludes only the
 * 9A009.a branch (NOT 9A009.b), `1C450.A.1`/`1C450.A.2` only those two salts
 * (NOT the bare 1C450 family). A bare entry (e.g. `1C351`) excludes the whole
 * entry incl. its sub-codes (1C351.d.4 etc.), which is what the OJ intends.
 */
const EU001_SECTION_I_EXPLICIT_CODES: readonly string[] = [
  "0C001", // 0C001 natural/depleted uranium or thorium
  "0C002", // 0C002 special fissile materials (other than those in Annex IV)
  "0D001", // 0D001 software for Cat-0 goods (in so far as it relates to 0C001/excluded 0C002)
  "0E001", // 0E001 technology for Cat-0 goods (in so far as it relates to 0C001/excluded 0C002)
  "1A102", // 1A102 resaturated pyrolised carbon-carbon for 9A004/9A104
  "1C351", // 1C351 human/animal pathogens and "toxins"
  "1C353", // 1C353 genetic elements and GMOs
  "1C354", // 1C354 plant pathogens
  "1C450.A.1", // 1C450.a.1 Amiton + alkylated/protonated salts
  "1C450.A.2", // 1C450.a.2 PFIB
  "7E104", // 7E104 technology for flight-management trajectory optimisation
  "9A009.A", // 9A009.a hybrid rocket propulsion systems > 1.1 MNs (ONLY .a, NOT 9A009.b)
  "9A117", // 9A117 staging/separation mechanisms and interstages usable in "missiles"
];

/**
 * EU001 Section I exclusion — PART (1): the Annex IV (2021/821) member set.
 *
 * Section I excludes "all items specified in Annex IV". Annex IV (OJ L 206,
 * 11.6.2021, p. 449–456) is the most-sensitive intra-Union-transfer list; its
 * members are a curated subset of Annex I codes. `ClassificationLike` carries
 * only the declared ECCN (no item-level Annex-IV flag and no upstream Annex-IV
 * item match), so the exclusion is modelled directly from the verbatim Annex IV
 * member codes below (extracted from the OJ text, both Part I + Part II).
 *
 * Granularity = exactly as Annex IV lists each member. Where Annex IV lists a
 * SUB-item of an Annex I parent (e.g. 9A007.a, 9A008.d, 9A105.a, 9A106.c,
 * 9A108.c, 5A004.a, 5D002.a.3, 5D002.c.3, 5E002.a, 6D003.a, 8A002.o.3, 8E002.a,
 * 1C012.b, 1C351.d.4/.5), BOTH the precise sub-code AND its bare parent stem are
 * listed: a declared bare parent (e.g. "9A106") cannot be cleanly confirmed to
 * sit OUTSIDE the Annex-IV sub-item, so it is excluded fail-closed (§4.5,
 * over-strict-but-safe — never a guessed GO). This is why golden 9A004 (sat-bus)
 * and 9A106 (apogee-engine) correctly STAY REVIEW.
 *
 * For Category 0: Annex IV states "All Category 0 of Annex I is included" except
 * 0C001 (fully excluded) and 0C002 (excluded except separated Pu / U>20%). 0C001/
 * 0C002/0D001/0E001 already sit on the explicit list above; the remaining Cat-0
 * codes (0A.../0B.../0C003/0D.../0E... beyond 0D001/0E001) are Annex IV members,
 * so the whole "0" category is excluded by the `0` stem (over-strict-but-safe —
 * a Cat-0 nuclear item is never EU001-eligible to friendly destinations anyway).
 */
const EU001_ANNEX_IV_EXCLUDED_PREFIXES: readonly string[] = [
  // Category 0 (NSG) — whole category is in Annex IV (0C001/0C002 caveats sit on
  // the explicit list; the residual Cat-0 is all Annex IV). Stem-match = safe.
  "0",
  // Category 1 — Annex IV members (stealth + Union-strategic + NSG).
  "1A007", // 1A007 detonator firing sets / explosive detonators
  "1B226", // 1B226 electromagnetic isotope separators
  "1B231", // 1B231 tritium facilities
  "1B233", // 1B233 lithium isotope separation
  "1C001", // 1C001 EM-absorbing / intrinsically conductive polymers (stealth)
  "1C012", // 1C012.b previously-separated neptunium-237 (bare parent → fail-closed)
  "1C101", // 1C101 reduced-observables materials/devices (stealth)
  "1C233", // 1C233 lithium-6 enriched
  "1C235", // 1C235 tritium/tritium compounds
  "1C239", // 1C239 high explosives (Union strategic)
  "1D103", // 1D103 software for reduced-observables analysis
  "1E001", // 1E001 technology for 1C012.b
  "1E101", // 1E101 technology for 1C101/1D103
  "1E102", // 1E102 technology for 1D103 software
  "1E201", // 1E201 technology for 1B226/1B231/1B233/1C233/1C235 (+ 1C239)
  // 1C351.d.4 / 1C351.d.5 (CWC ricin/saxitoxin) — bare 1C351 already on the
  // explicit list, so the whole 1C351 entry is covered there.
  // Category 3 — Annex IV members (Union strategic + NSG).
  "3A228", // 3A228 switching devices (cold-cathode / spark-gaps)
  "3A229", // 3A229 high-current pulse generators
  "3A231", // 3A231 neutron generator systems
  "3A232", // 3A232 multipoint initiation systems
  "3E201", // 3E201 technology for 3A228/3A229/3A231/3A232
  // Category 5 part 2 — Annex IV cryptanalysis members. Bare parents listed too
  // (fail-closed for a bare 5A004/5D002/5E002 declaration).
  "5A004.A", // 5A004.a cryptanalytic equipment
  "5A004", // bare parent → fail-closed
  "5D002.A.3", // 5D002.a.3 software for 5A004.a/.b
  "5D002.C.3", // 5D002.c.3 software functioning as 5A004.a/.b
  "5D002", // bare parent → fail-closed
  "5E002.A", // 5E002.a technology for 5A004.a / 5D002.a.3 / 5D002.c.3
  "5E002", // bare parent → fail-closed
  // Category 6 — Annex IV members (acoustics + radar XS + NSG).
  "6A001", // 6A001 acoustics (multiple Annex-IV sub-items) — stem-match = safe
  "6A203", // 6A203 streak/framing cameras
  "6A225", // 6A225 velocity interferometers
  "6A226", // 6A226 pressure sensors
  "6B008", // 6B008 pulse radar cross-section systems
  "6B108", // 6B108 radar XS systems usable for missiles
  "6D003.A", // 6D003.a software for real-time acoustic-data processing
  "6D003", // bare parent → fail-closed
  // Category 7 — Annex IV MTCR-technology members.
  "7A117", // 7A117 guidance sets usable in missiles
  "7B001", // 7B001 test/cal/alignment equipment for 7A117
  "7B003", // 7B003 production equipment for 7A117
  "7B103", // 7B103 production facilities for 7A117
  "7D101", // 7D101 software for 7B003/7B103
  "7E001", // 7E001 technology for 7A117/7B003/7B103/7D101 development
  "7E002", // 7E002 technology for 7A117/7B003/7B103 production
  "7E101", // 7E101 technology for 7A117/7B003/7B103/7D101 use
  // Category 8 — Annex IV members.
  "8A002.O.3", // 8A002.o.3 noise-reduction systems for vessels ≥1000 t
  "8A002", // bare parent → fail-closed
  "8E002.A", // 8E002.a technology for underwater-noise-reduction propellers
  "8E002", // bare parent → fail-closed
  // Category 9 — Annex IV MTCR-technology members. CRITICAL: 9A004 (space launch
  // vehicles) + 9A106.c (thrust-vector control) are HERE — golden sat-bus/apogee
  // stay fail-closed REVIEW. Bare parents listed where Annex IV lists a sub-item.
  "9A004", // 9A004 space launch vehicles (≥500 kg / ≥300 km)
  "9A005", // 9A005 liquid rocket propulsion systems
  "9A007.A", // 9A007.a solid rocket propulsion systems
  "9A007", // bare parent → fail-closed
  "9A008.D", // 9A008.d movable-nozzle / fluid-injection TVC components
  "9A008", // bare parent → fail-closed
  "9A104", // 9A104 sounding rockets (≥500 kg / ≥300 km)
  "9A105.A", // 9A105.a liquid-propellant rocket engines
  "9A105", // bare parent → fail-closed
  "9A106.C", // 9A106.c thrust-vector control sub-systems
  "9A106", // bare parent → fail-closed (apogee-engine golden item)
  "9A108.C", // 9A108.c thrust-vector control sub-systems (solid)
  "9A108", // bare parent → fail-closed
  "9A116", // 9A116 reentry vehicles + equipment therefor
  "9A119", // 9A119 individual rocket stages
  "9B115", // 9B115 production equipment for 9A005/9A007.a/… stages
  "9B116", // 9B116 production facilities for 9A004 + the 9A005/… family
  "9D101", // 9D101 software for 9B116
  "9E001", // 9E001 technology for 9A004/9A005/…/9B116/9D101 development
  "9E002", // 9E002 technology for 9A004/9A005/…/9B116 production
  "9E101", // 9E101 technology for 9A104/9A105.a/9A106.c/9A108.c/9A116/9A119
  "9E102", // 9E102 technology for the 9A004/… launch-vehicle family use
];

/** Normalise a declared code for prefix comparison (uppercase, trimmed). */
function normCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/**
 * Does the normalised declared `code` match `pattern`?
 *
 * Match when `code` equals `pattern` OR is a sub-code of it (next char is a `.`
 * boundary). This is sub-precise: `9A009.A` matches `9A009.A` and `9A009.A.1`
 * but NOT `9A009.AB` or `9A009.B`; bare `1C351` matches `1C351`, `1C351.D.4`
 * etc.; the Cat-0 `0` stem matches any `0...` code. A boundary check (rather
 * than a raw `startsWith`) prevents `9A106` from spuriously matching e.g.
 * `9A1060` while still catching the real `9A106.c` sub-code.
 */
function matchesCode(code: string, pattern: string): boolean {
  if (code === pattern) return true;
  if (!code.startsWith(pattern)) return false;
  // Single-char category stems ("0") match the whole category — no boundary.
  if (pattern.length === 1) return true;
  const next = code.charAt(pattern.length);
  // Sub-code boundary: a "." after the matched pattern (e.g. 1C450.A.1 under
  // 1C450.A). Anything else (a continued digit/letter) is a DIFFERENT code.
  return next === ".";
}

/**
 * Fail-closed bare-PARENT guard. A declared code that is a strict PARENT of a
 * more-specific excluded sub-code (bare `9A009` over the excluded `9A009.A`, or
 * bare `1C450` over `1C450.A.1`/`1C450.A.2`) cannot be cleanly confirmed to be
 * the NON-excluded sibling — the bare code SPANS both the excluded and the
 * eligible sub-items, so a GO would be a guess.
 *
 * This is load-bearing: the EU Annex I corpus classifies hybrid rocket motors
 * as the BARE `9A009` entry (`src/data/trade/eu-annex-i.ts`, title "Hybrid
 * rocket motors", control reason MT/MTCR) — there is no `9A009.a`/`9A009.b`
 * split on the EU side. Without this guard a 9A009.a-class motor (>1.1 MNs total
 * impulse — the Section-I-excluded MTCR variant) declared as bare `9A009` would
 * wrongly clear under EU001: a false-CLEARED on rocket propulsion. So a bare
 * parent is treated Section-I-excluded (§4.5, over-strict-but-safe). A TRUE
 * sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any excluded code,
 * so it is unaffected and stays EU001-eligible — the sub-precision is preserved.
 *
 * (Annex IV sub-items already carry explicit bare parents in
 * `EU001_ANNEX_IV_EXCLUDED_PREFIXES`, e.g. `9A106` beside `9A106.C`; this guard
 * generalises the SAME fail-closed treatment to the explicit Art. 12(6)(a)
 * sub-codes `9A009.A` / `1C450.A.1` / `1C450.A.2`, which have no bare parent in
 * the data.) Expects an already-normalised (`normCode`) input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    EU001_SECTION_I_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    EU001_ANNEX_IV_EXCLUDED_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the EU001 Section I exclusion list?
 *   PART (1) "all items specified in Annex IV"  — `EU001_ANNEX_IV_EXCLUDED_PREFIXES`
 *   PART (2) the explicit Article-12(6)(a) list — `EU001_SECTION_I_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded
 * sub-code, e.g. the EU corpus's bare `9A009` over `9A009.a`).
 * (Reg (EU) 2021/821 Annex II Section I + Annex IV; OJ L 206, 11.6.2021.)
 */
function isSectionIExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    EU001_SECTION_I_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    EU001_ANNEX_IV_EXCLUDED_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The EU-controlled dual-use code carried by a classification, if any.
 * EU control attaches via a declared `eccnEU` (Annex I) OR a declared
 * non-EAR99 `eccnUS` that is, in this corpus, the US-CCL mirror of an Annex I
 * dual-use item. Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is NOT an EU dual-use control — it is handled by
 * the upstream ITAR gate and is never EU001-eligible.
 */
function euControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * EU001 as a `GeneralLicence` for the generic evaluator. `eligibleCodes` =
 * the item carries an EU-controlled code that is NOT on the Section I
 * exclusion list. `eligibleDestinations` = the EU001 country set. There are no
 * destination-specific exclusions beyond the allow-set itself (EU001 is a
 * positive allow-list), so `excludedDestinations` is empty.
 */
export const EU001: GeneralLicence = {
  id: "EU001",
  label:
    "EUGEA EU001 — Union General Export Authorisation (friendly destinations)",
  authority: "EU national competent authority",
  eligibleCodes: (c) => {
    const code = euControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream, not via EU001
    return !isSectionIExcluded(code);
  },
  eligibleDestinations: EU001_DESTINATIONS,
  excludedDestinations: new Set<string>(),
  conditions: [
    "Vor erster Nutzung bei der zuständigen nationalen Behörde (NCA) registrieren (Reg 2021/821 Art. 26(3)).",
    "In der Zollanmeldung die Nutzung der Union-Allgemeingenehmigung 'EU001' angeben (Annex II EU001 Part 3).",
    "Keine Nutzung, wenn das Gut für WMD-/Trägerwaffen-Zwecke oder für militärische Endverwendung in einem Embargoland bestimmt ist (Annex II EU001 Part 3 Catch-all).",
  ],
  citation: SRC_ANNEX_II,
  asOfDate: EU_EUGEA_AS_OF,
};

/** All curated EU EUGEAs (space-relevant). Currently EU001 — see file header. */
export const EU_GENERAL_LICENCES: readonly GeneralLicence[] = [EU001];

/**
 * EU `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not EU-controlled → NONE/GO.
 *   2. EU-controlled + EU001 covers item×destination → GENERAL/GO under EU001.
 *   3. EU-controlled + no EUGEA covers it → INDIVIDUAL/REVIEW at the member NCA.
 *
 * Authority resolved from `exporterSeat` (member→NCA); unknown seat → generic
 * EU label + a seat-unknown note (fail-closed, never assume a member).
 *
 * Hard destination prohibitions (embargo / RU-BY / Annex-IV / ITAR) are decided
 * UPSTREAM by the engine gates and are never reached here as GO — the wiring
 * skips this module entirely when a hard prohibition already blocks.
 */
export const euOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry, exporterSeat } = input;
  const { authority, seatKnown } = resolveEuMemberNca(exporterSeat);
  const seatNote = seatKnown
    ? []
    : [
        "Exporteur-Sitz unbekannt — NCA nicht eindeutig bestimmbar; zuständige Behörde des tatsächlichen Sitz-Mitgliedstaats verwenden.",
      ];

  const code = euControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 0. Intra-EU transfer (destination is an EU-27 member state) → NONE/GO.
  //    Dual-use items move freely within the Union customs territory; an
  //    export authorisation is only needed for transfers OUT of the EU. The
  //    sole exception is the most-sensitive Annex IV items (intra-EU transfer
  //    licence under Art. 11) — those carry no EUGEA path anyway and are
  //    handled by the upstream Annex-IV gate (Gate 0), never reaching a GENERAL
  //    GO here. This mirrors the engine's Gate-3.5 `destinationKnownNonEU`
  //    guard (it does NOT fire for intra-EU destinations).
  if (dest && EU27_MEMBER_STATES.has(dest)) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority,
      reasons: [
        `Innergemeinschaftliche Verbringung (${dest}) — EU-Dual-Use-Güter (außer Anhang IV) bewegen sich im Unionszollgebiet frei; keine Ausfuhrgenehmigung erforderlich.`,
        ...seatNote,
      ],
      citations: [SRC_REG],
    };
  }

  // 1. Uncontrolled under EU dual-use → no EU licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority,
      reasons: [
        "Gut trägt keinen EU-Dual-Use-Kontrollcode (Anhang I VO 2021/821) — keine EU-Ausfuhrgenehmigung erforderlich.",
        ...seatNote,
      ],
      citations: [SRC_REG],
    };
  }

  // 2. EU-controlled + an EUGEA covers item×destination → GENERAL/GO.
  const covering = EU_GENERAL_LICENCES.find((lic) =>
    evaluateGeneralLicence(lic, classification, destinationCountry),
  );
  if (covering) {
    return {
      outcome: "GO",
      licenceType: "GENERAL",
      authority,
      generalLicence: {
        id: covering.id,
        label: covering.label,
        conditions: covering.conditions,
      },
      reasons: [
        `EU-kontrolliertes Dual-Use-Gut (${code}) nach ${destinationCountry}: Union-Allgemeingenehmigung ${covering.id} greift — kein Einzelantrag nötig, sofern die Auflagen erfüllt sind.`,
        ...seatNote,
      ],
      citations: [SRC_REG, covering.citation],
    };
  }

  // 3. EU-controlled + no EUGEA covers it → INDIVIDUAL/REVIEW at the NCA.
  //    Either the destination is outside every EUGEA allow-set, or the code is
  //    on the EU001 Section I exclusion list (Art. 12(6)(a) list incl. "all
  //    items specified in Annex IV" — e.g. 9A004/9A106.c MTCR launch tech).
  const excluded = isSectionIExcluded(code);
  const sectionINote = excluded
    ? `Code ${code} steht auf der EU001-Ausschlussliste (Annex II Section I, Art. 12(6)(a) — inkl. „alle in Anhang IV genannten Güter") und ist von EU001 nicht gedeckt.`
    : `Für ${destinationCountry} greift keine Union-Allgemeingenehmigung (EU001 deckt nur AU/CA/IS/JP/NZ/NO/CH/LI/GB/US).`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority,
    reasons: [
      `EU-kontrolliertes Dual-Use-Gut (${code}) nach ${destinationCountry}: ${sectionINote} Einzelausfuhrgenehmigung bei der zuständigen NCA erforderlich.`,
      ...seatNote,
    ],
    citations: excluded
      ? [SRC_REG, SRC_ANNEX_II, SRC_ANNEX_IV]
      : [SRC_REG, SRC_ANNEX_II],
  };
};
