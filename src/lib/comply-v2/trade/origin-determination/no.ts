/**
 * Norway origin module (Spec 2026-06-13 §4.2, M-NO) — the individual-licence
 * determination for an exporter seated in Norway (NO).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a NO-seated exporter, Norwegian export-control law is the "Forskrift om
 * eksport av forsvarsmateriell, flerbruksvarer, teknologi og tjenester"
 * (FOR-2013-06-19-718), issued under the Eksportkontrolloven (LOV-1987-12-18-93)
 * by the Norwegian Ministry of Foreign Affairs (Utenriksdepartementet, MFA) and
 * administered by the Directorate/Agency for Export Control and Sanctions
 * (DEKSA). Norway is an EEA — NOT an EU — member; a NO-origin dual-use export
 * needs a Norwegian licence in its own right. Norway adopts the EU dual-use list
 * one-to-one: its Liste II (Vedlegg II) IS EU Reg. (EU) 2021/821 Annex I, with
 * BYTE-IDENTICAL goods numbers (`9A004`, `5A002`, …; see `no-list.ts`). This
 * module decides, for a given classified item × destination:
 *   • item not NO-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled → INDIVIDUAL/REVIEW = individual MFA licence (see below — there
 *     is NO general-licence GO path for dual-use items).
 *
 * ─── WHY THERE IS NO GENERAL LICENCE (the verified, expected finding) ──────
 * VERIFIED against the official sources (deksa.no + regjeringen.no, double-
 * sourced): Norway has NO item+destination-only self-executing general/global
 * export authorisation for DUAL-USE items — no EU001-equivalent. To export a
 * dual-use item "you must have a licence issued by the Ministry of Foreign
 * Affairs"; the individual and global licences are both granted to ONE NAMED
 * EXPORTER following an application (the global licence may cover several items/
 * destinations for that applicant, but it is exporter-specific and application-
 * based, NOT self-executing on code+destination). The only instrument with
 * "general" in its name — the GENERAL TRANSFER LICENCE (generell overførings-
 * lisens) — is for DEFENCE-related products (Liste I) ONLY, to recipients within
 * the EEA ONLY, and requires prior REGISTRATION with the MFA (it transposes the
 * EU Defence Transfers Directive 2009/43/EC). It is therefore NOT a dual-use
 * third-country export authorisation and NOT item+destination-only.
 *
 * Consequence (§4.5, the honest position): a CH/EU exporter clears a non-
 * sensitive dual-use item to a friendly destination under the OGB/EU001; a
 * NORWEGIAN exporter of the SAME item to the SAME destination still needs an
 * individual MFA licence. So this module models an EMPTY general-licence set
 * (`NO_GENERAL_LICENCES = []`) and EVERY controlled Liste-II item falls to
 * INDIVIDUAL/REVIEW at the MFA — a cited, origin-specific REVIEW, never a guessed
 * GO. This is the correct, valuable answer (a few origins genuinely have no auto-
 * grantable general licence); the verdict distribution for NO is UNCHANGED from
 * the prior Gate-4.5 thin-coverage REVIEW, but now it is PRECISE and CITED.
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (defence-in-depth, §4.5) ────────────────
 * Because there is no general licence, every controlled code is REVIEW already,
 * so a sensitive-exclusion floor is not strictly load-bearing for the verdict.
 * It is nevertheless carried — mirroring M-CH (`ch.ts`) byte-for-byte — for two
 * reasons: (1) defence-in-depth — should a curator ever add a NO general licence
 * in the future, the most-sensitive MTCR/Annex-IV-equivalent codes (9A004 space
 * launch vehicles, 9A106.c thrust-vector control) MUST never become eligible
 * (no false-CLEARED); and (2) it lets the REVIEW reason distinguish a sensitive
 * MTCR/Annex-IV item from an ordinary controlled item. Switzerland and Norway
 * transpose the IDENTICAL international control lists (Wassenaar/MTCR/NSG/AG) the
 * EU/UK do, so the floor reuses the EXACT EU/UK-verified exclusion set (EU
 * 2021/821 Annex II Section I = retained Reg 428/2009 Annex IIg, byte-identical):
 * "all items in Annex IV" + the 13 explicit codes, plus the fail-closed
 * bare-PARENT guard. So golden sat-bus (9A004) and apogee-engine (9A106)
 * correctly STAY REVIEW for every NO destination.
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * For a NO seat, `dualUsePrimary = NO_LIST`, `militaryPrimary = null`. Until M-NO
 * the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a NO-seat
 * controlled export (REGIME_MATURITY NO_LIST = 3). M-NO lifts it to 2 and
 * registers this module; Gate 4.5 stops firing for NO. The module NEVER emits a
 * GENERAL verdict, so the wiring's GENERAL-supersede branch never runs for NO —
 * the module's INDIVIDUAL/REVIEW folds in as the precise origin-licence answer
 * (the existing generic Gate-3.5/Gate-4 REVIEW rows still aggregate to the same
 * REVIEW gate; no contradictory GO is produced). Hard destination prohibitions
 * (embargo / RU-BY / ITAR) are decided UPSTREAM and are NEVER reached here as GO
 * — the wiring skips this module when a hard prohibition already blocks (Norway
 * applies the EU-aligned RU/BY sanctions; Gate 1.6 keeps a NO→RU controlled
 * dual-use export BLOCKED). An item bearing a US ECCN (eccnUS) also carries an
 * independent US/BIS leg the module does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://lovdata.no/dokument/SF/forskrift/2013-06-19-718 — Forskrift FOR-2013-06-19-718 (the Norwegian export control regulation; Liste II = dual-use)
 * @see https://lovdata.no/dokument/SF/forskrift/2013-06-19-718/vedleggII — Liste II (Vedlegg II, dual-use), adopting EU Reg. (EU) 2021/821 Annex I one-to-one
 * @see https://deksa.no/en/export-control/more-information-for-exporters/ — DEKSA: dual-use export needs an MFA licence; the general transfer licence is defence-only/EEA-only/registration-based
 * @see https://www.regjeringen.no/contentassets/e19e0d2f0fe74437897036c1ddaf45f6/the-export-control-regulations.pdf — the Export Control Regulations (MFA = licensing authority; licence types)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";

/** The issuing/competent authority for Norwegian strategic export controls. */
const NO_AUTHORITY = "Norwegian MFA (Utenriksdepartementet)";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_FORSKRIFT =
  "https://lovdata.no/dokument/SF/forskrift/2013-06-19-718 — Forskrift om eksport av forsvarsmateriell, flerbruksvarer, teknologi og tjenester (FOR-2013-06-19-718), Liste II (flerbruksvarer/dual-use)";
const SRC_DEKSA =
  "https://deksa.no/en/export-control/more-information-for-exporters/ — DEKSA / Utenriksdepartementet: a dual-use export needs an MFA licence (individual/global, exporter-specific, application-based); NO item+destination-only general authorisation for dual-use; the 'general transfer licence' is defence-only, EEA-only, registration-based (EU Directive 2009/43/EC)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; Norway transposes the same lists
 * via Wassenaar/MTCR/NSG/AG and adopts EU Reg. 2021/821 Annex I one-to-one). This
 * is the no-false-CLEARED safety-floor source (defence-in-depth); it is not a
 * claim that the Norwegian regulation writes a general-licence exclusion schedule
 * (Norway has no dual-use general licence at all).
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Norway mirrors via Wassenaar/MTCR/NSG/AG and adopts in Liste II); used as the no-false-CLEARED sensitive floor (defence-in-depth)";

/** Determination freshness as-of (verification date against the official sources). */
export const NO_DETERMINATION_AS_OF = "2026-06-13";

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Norway transposes the identical Wassenaar/MTCR/NSG/AG
 * lists and adopts EU Annex I one-to-one, so the SAME most-sensitive codes the
 * EU/UK exclude from their self-executing general licences are flagged here as
 * the defence-in-depth sensitive floor. Stored normalised (UPPERCASE) for
 * comparison. The matcher (`matchesCode`) is sub-precise: `9A009.A` matches only
 * the .a branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts (NOT bare
 * 1C450).
 */
const NO_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. Norway mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/NSG/AG) and adopts EU Annex I in Liste II,
 * so the member codes below mirror the EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly
 * (= the M-CH floor). Where Annex IV lists a SUB-item of a parent, BOTH the
 * precise sub-code AND its bare parent stem are listed: a declared bare parent
 * (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE the sensitive
 * sub-item, so it fail-closes (§4.5). This is why golden 9A004 (sat-bus) and
 * 9A106 (apogee-engine) correctly STAY REVIEW for a NO seat.
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (a Cat-0
 * nuclear item is the most-sensitive class anyway).
 */
const NO_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
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
 * eligible sub-items, so flagging it sensitive is the safe call.
 *
 * This is carried for defence-in-depth: the Norwegian Liste II (= EU Annex I,
 * mirrored in `no-list.ts`) classifies hybrid rocket motors as the BARE `9A009`
 * (no .a/.b split). Should a NO general licence ever be added, a 9A009.a-class
 * motor (>1.1 MNs — the sensitive MTCR variant) declared as bare `9A009` must
 * never clear — so a bare parent is treated sensitive (§4.5). A TRUE sibling
 * sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any excluded code, so it is
 * unaffected. (For NO every controlled code is REVIEW regardless, so this only
 * affects the REVIEW reason text today.) Expects a normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    NO_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    NO_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (most-sensitive MTCR/Annex-IV-
 * equivalent)?
 *   PART (1) the Annex-IV-equivalent set — `NO_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `NO_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the NO corpus's bare `9A009` over `9A009.a`).
 *
 * This floor is the no-false-CLEARED defence-in-depth position; today it only
 * differentiates the REVIEW reason text (sensitive vs. ordinary controlled),
 * because Norway has no dual-use general licence so every controlled code is
 * REVIEW regardless.
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    NO_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    NO_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The NO-controlled dual-use code carried by a classification, if any.
 * NO control attaches via a declared `eccnEU` (the Norwegian Liste II is byte-
 * identical to EU Annex I) OR a declared non-EAR99 `eccnUS` (which, in this
 * corpus, is the Wassenaar/CCL mirror of the same dual-use item Norway adopts).
 * Returns the operative code (eccnEU preferred), else null. USML/ITAR
 * (`usmlCategory`) is a US control handled by the upstream ITAR gate and is never
 * a Norwegian dual-use licence question.
 */
function noControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * All curated NO general licences (space-relevant). EMPTY — the VERIFIED finding
 * (see the file header): Norway has NO item+destination-only self-executing
 * general/global export authorisation for dual-use items. Every controlled
 * Liste-II item is an individual MFA licence → INDIVIDUAL/REVIEW. The empty array
 * is the honest, correct model (a few origins genuinely have no auto-grantable
 * general licence) — never inventing an eligibility the law does not grant.
 */
export const NO_GENERAL_LICENCES: readonly GeneralLicence[] = [];

/**
 * Norway `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not NO-controlled → NONE/GO.
 *   2. NO-controlled → INDIVIDUAL/REVIEW = individual MFA licence (there is no
 *      general-licence GO path for dual-use items, so step 2 of the EU/UK/CH flow
 *      — "a general licence covers item×destination → GENERAL/GO" — has no
 *      candidate here and is skipped; `NO_GENERAL_LICENCES` is empty).
 *
 * There is no member→NCA resolution (the MFA/DEKSA is the single Norwegian
 * authority), so `exporterSeat` is not consulted; authority is always the
 * Norwegian MFA (Utenriksdepartementet).
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Norway applies the
 * EU-aligned RU/BY sanctions; Gate 1.6 keeps NO→RU controlled dual-use BLOCKED).
 */
export const noOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = noControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Norwegian dual-use control → no NO licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: NO_AUTHORITY,
      reasons: [
        "Gut trägt keinen norwegischen Dual-Use-Kontrollcode (Liste II / Vedlegg II der Forskrift FOR-2013-06-19-718, die die EU-Dual-Use-Liste 2021/821 Anhang I übernimmt) — keine norwegische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_FORSKRIFT],
    };
  }

  // 2. NO-controlled → INDIVIDUAL/REVIEW = individual MFA licence.
  //    Norway has NO item+destination-only general/global authorisation for
  //    dual-use items (verified) — the only "general" instrument is the
  //    defence-only/EEA-only/registration-based general transfer licence, which
  //    is not a dual-use export authorisation. So EVERY controlled Liste-II item
  //    is an individual MFA licence to EVERY destination — no GO path exists, and
  //    the most-sensitive MTCR/Annex-IV-equivalent codes (9A004/9A106.c) are
  //    flagged for the reason text but are REVIEW regardless (defence-in-depth).
  const sensitive = isSensitiveExcluded(code);
  const reasonDetail = sensitive
    ? `Code ${code} ist zudem ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut.`
    : `Norwegen kennt für Dual-Use-Güter keine auf Code×Ziel selbst-ausführende General-/Sammelausfuhrgenehmigung (kein EU001-Äquivalent); die einzige „general transfer licence" gilt nur für Verteidigungsgüter (Liste I) im EWR und ist registrierungsgebunden.`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: NO_AUTHORITY,
    reasons: [
      `Norwegisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Einzelausfuhrgenehmigung beim norwegischen Außenministerium (Utenriksdepartementet, verwaltet durch DEKSA) erforderlich.`,
    ],
    citations: sensitive
      ? [SRC_FORSKRIFT, SRC_DEKSA, SRC_SENSITIVE_FLOOR]
      : [SRC_FORSKRIFT, SRC_DEKSA],
  };
};
