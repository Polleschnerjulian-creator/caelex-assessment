/**
 * South Korea origin module (Spec 2026-06-13 §4.2, M-KR) — the MOTIE individual-
 * licence determination for an exporter seated in the Republic of Korea (KR).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a KR-seated exporter, Korean export-control law is the Public Notice on
 * Trade of Strategic Items (전략물자 수출입고시), issued by MOTIE (Ministry of
 * Trade, Industry and Energy) under the Foreign Trade Act (대외무역법) Art. 19.
 * Korea is not an EU/EEA member; a KR-origin strategic-item export needs a
 * Korean (MOTIE) licence in its own right. Korea participates in Wassenaar
 * (1996) / NSG (1995) / Australia Group (1996) / MTCR (2001) and its Annex-2
 * dual-use codes are byte-compatible with the EU/Wassenaar numbering (`9A004`,
 * `5A001`, …; see `kr-strategic.ts`). This module decides, for a given
 * classified item × destination:
 *   • item not KR-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled → INDIVIDUAL/REVIEW = individual export licence (개별수출허가)
 *     at MOTIE, for EVERY destination (see the next paragraph for WHY there is
 *     no general-licence GO path).
 *
 * ─── WHY M-KR HAS NO AUTO-GRANTABLE GENERAL LICENCE (the honest position) ──
 * Unlike the EU (EUGEA EU001), the UK (the EU-member OGEL) or Switzerland (the
 * ordinary OGB) — each of which has at least ONE general licence whose
 * eligibility is determinable from item × destination ALONE — the Korean
 * comprehensive export licence (포괄수출허가, pogwal heoga) is NOT a self-
 * executing item+destination general licence. The official Korean legal-info
 * portal (easylaw.go.kr, 찾기쉬운 생활법령정보, Ministry of Government
 * Legislation) describes the comprehensive licence as a SPECIAL PRIVILEGE
 * granted to a 자율준수무역거래자 (self-compliance trader): such traders
 * "voluntarily establish strategic-material control systems, RECEIVE GOVERNMENT
 * DESIGNATION, and are granted special privileges such as comprehensive export
 * licenses." Lexology ("Export controls in South Korea") confirms the mechanism:
 * "comprehensive licences are issued after MOTIE certifies that a company has
 * incorporated an internal compliance programme into its business operations …
 * and permit exports of certain items without an individual licence for a given
 * period." So the comprehensive licence is GATED on a per-COMPANY government
 * designation / internal-compliance-programme certification — an EXPORTER-
 * SPECIFIC fact the engine's item × destination input cannot establish (exactly
 * like the EU's exporter-specific EU002-008 and the Swiss AGB, GKV Art. 13).
 * The "general comprehensive" (Group A / Ga region) vs "special comprehensive"
 * (Group B / Na region) split only chooses WHICH comprehensive licence a
 * DESIGNATED trader holds; it does NOT make any export auto-grantable from
 * item×destination alone.
 *
 * The "Ga" region (Zone A) = the ~29 regime-partner countries (incl. the EU
 * members, US, JP — India is NOT Zone A). Zone A only RELAXES the individual-
 * licence review (SIPRI/Lexology: "approval for Zone A countries is rather
 * routinely granted"; Kim & Chang on Japan's 2023 whitelist reinstatement:
 * relaxed licensing standards, shorter review, less documentation) — i.e. an
 * approval is still APPLIED FOR. Zone A is therefore a review-burden relaxation,
 * NOT a self-executing general licence. Per §3 / §4.5 / §11 of the spec, the
 * honest answer for KR is mostly individual-licence/REVIEW with NO auto-grantable
 * general licence — "that is CORRECT and valuable (a cited, origin-specific
 * REVIEW naming MOTIE)". A guessed GO under a comprehensive licence we cannot
 * confirm the exporter holds would be a CATASTROPHIC false-CLEARED.
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (carried for the citation + future-proofing) ─
 * Because M-KR emits no general-licence GO, the sensitive floor does NOT change
 * any OUTCOME here (every controlled code is REVIEW regardless). Its purpose is
 * (a) to PRECISELY PIN the sensitive items (9A004 space launch vehicles, 9A106.c
 * thrust-vector control, the 13 explicit Section-I codes, the Annex-IV-equivalent
 * set) with the MTCR/Annex-IV-equivalent CITATION rather than the generic
 * comprehensive-licence reason — Korea is in MTCR and reviews satellite/MTCR
 * exports CASE-BY-CASE even to Zone A (Breaking Defense / Commerce 2023: no
 * presumption of denial, but still case-by-case review) — and (b) to keep the
 * module HONEST if a future general-licence build is ever added: these codes
 * must NEVER be loosened. Switzerland's M-CH established this exact "GKV/Public-
 * Notice text carries no self-executing goods-exclusion schedule, so reuse the
 * EU/UK-verified Annex-IV + 13-code floor as the no-false-CLEARED safety floor"
 * pattern; Korea transposes the IDENTICAL Wassenaar/MTCR/NSG/AG lists, so the
 * floor is byte-identical (EU 2021/821 Annex II Section I = retained Reg
 * 428/2009 Annex IIg). The fail-closed bare-PARENT guard is carried too (the KR
 * Annex-2 classifies hybrid rocket motors as the BARE `9A009`, no .a/.b split).
 *
 * ─── Engine interaction (§4.3) ─────────────────────────────────────────────
 * For a KR seat, `dualUsePrimary = KR_STRATEGIC`, `militaryPrimary = null`.
 * Until M-KR the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a
 * KR-seat controlled export (REGIME_MATURITY KR_STRATEGIC = 3). M-KR lifts it to
 * 2 and registers this module; Gate 4.5 stops firing for KR. Because the module
 * emits INDIVIDUAL/REVIEW (never GENERAL/GO) for controlled items, the wiring's
 * "supersede the generic EU dual-use REVIEW with a module GO" branch (only
 * triggered on a GENERAL verdict) is NEVER taken for KR — the engine keeps its
 * own generic REVIEW row(s) and folds the module's MOTIE INDIVIDUAL/REVIEW
 * alongside them; the aggregate stays REVIEW (the correct, cited result). Hard
 * destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM and are
 * NEVER reached here as GO — the wiring skips this module when a hard prohibition
 * already blocks (Korea established a near-total RU/BY export ban — control list
 * expanded 57→798 items; Gate 1.6 keeps a KR→RU controlled dual-use export
 * BLOCKED). An item bearing a US ECCN (eccnUS) also carries an independent
 * US/BIS leg the module does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.yestrade.go.kr — MOTIE Yestrade national strategic-items system
 * @see https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=577&ccfNo=5&cciNo=2&cnpClsNo=2 — 찾기쉬운 생활법령정보 (Ministry of Government Legislation): 전략물자의 수출 및 허가 — licence types (개별/포괄수출허가) + the 자율준수무역거래자 (self-compliance trader) comprehensive-licence privilege
 * @see https://www.sipri.org/sites/default/files/files/misc/SIPRIBP1311.pdf — SIPRI BP "South Korea's Export Control System" (Zone A = ~29 regime partners, routine approval; Annex-2 uses EU/Wassenaar dual-use numbering)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";

/** The issuing/competent authority for Korean strategic export controls. */
const KR_AUTHORITY = "MOTIE";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_PUBLIC_NOTICE =
  "https://www.yestrade.go.kr — Public Notice on Trade of Strategic Items (전략물자 수출입고시), MOTIE, under the Foreign Trade Act (대외무역법) Art. 19; national system Yestrade";
const SRC_LICENCE_TYPES =
  "https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=577&ccfNo=5&cciNo=2&cnpClsNo=2 — 찾기쉬운 생활법령정보 (Ministry of Government Legislation): 전략물자의 수출 및 허가 — individual (개별수출허가) vs comprehensive (포괄수출허가) export licence; the comprehensive licence is a special privilege granted to a designated 자율준수무역거래자 (self-compliance trader), i.e. exporter-specific (CP-certified) — NOT a self-executing item+destination general licence";
const SRC_ZONE_A =
  "https://www.sipri.org/sites/default/files/files/misc/SIPRIBP1311.pdf — SIPRI BP 'South Korea's Export Control System' (Zone A / Ga region = ~29 regime-partner countries; approval for Zone A is routinely granted — i.e. an individual approval is still applied for, not a self-executing general licence)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; Korea transposes the same
 * Wassenaar/MTCR/NSG/AG lists). The SAFETY-floor source for precisely pinning
 * the most-sensitive codes (so a future general-licence build can never loosen
 * them); does NOT change any outcome here (KR has no general-licence GO path).
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Korea mirrors via Wassenaar/MTCR; Korea reviews satellite/MTCR exports case-by-case even to Zone A); used as the no-false-CLEARED sensitive-pin floor";

/** Public-Notice freshness as-of (verification date). */
export const KR_DETERMINATION_AS_OF = "2026-06-13";

/**
 * The "Ga" region (Zone A) regime-partner countries, ISO-2 — the ~29 Wassenaar/
 * MTCR/NSG/AG partner states for which MOTIE relaxes the individual-licence
 * review (routine approval / shorter review). Reused as the EU-27 set + the
 * non-EU regime partners (US, JP, GB, NO, CA, AU, CH, NZ — Korea's regime
 * counterparts). India (IN) is NOT Zone A.
 *
 * IMPORTANT: this set is EXPORTED + tested for data integrity, but it does NOT
 * gate any GO in this module — Zone A only relaxes the INDIVIDUAL-licence review
 * burden, it is NOT a self-executing general licence. It is modelled so the AVA
 * can show "Ga-region (Zone A): individual review routinely granted" as context
 * on the REVIEW, and so a future general-licence build (if Korea ever publishes a
 * self-executing item+destination general authorisation) has the destination set
 * already curated. The HONEST verdict today is INDIVIDUAL/REVIEW for every
 * controlled item regardless of Zone A membership.
 *
 * Curated as a fail-closed REGIME-PARTNER set (the only countries Korea's Zone A
 * could include are the multilateral-regime partners). Where the precise 29-state
 * list is not byte-verifiable in official English, this errs toward the
 * well-established regime partners; since it gates NO GO, an inexact membership
 * cannot cause a false-CLEARED.
 */
export const KR_GA_REGION_ZONE_A: ReadonlySet<string> = new Set([
  // EU-27 + EEA regime partners
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // Non-EU regime partners
  "US",
  "JP",
  "GB",
  "NO",
  "CH",
  "CA",
  "AU",
  "NZ",
]);

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Korea transposes the identical Wassenaar/MTCR/NSG/AG
 * lists, so the SAME most-sensitive codes the EU/UK exclude from their self-
 * executing general licences are the ones precisely pinned here. Stored
 * normalised (UPPERCASE). The matcher (`matchesCode`) is sub-precise: `9A009.A`
 * pins only the .a branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts.
 */
const KR_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. Korea mirrors it via the same
 * multilateral regimes, so the member codes below mirror the EU/UK
 * `ANNEX_IV_EXCLUDED_PREFIXES` exactly. Where Annex IV lists a SUB-item of a
 * parent, BOTH the precise sub-code AND its bare parent stem are listed: a
 * declared bare parent (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE
 * the sensitive sub-item, so it is pinned fail-closed (§4.5). This is why golden
 * 9A004 (sat-bus) and 9A106 (apogee-engine) carry the sensitive citation.
 *
 * For Category 0 the whole category is treated by the `0` stem (a Cat-0 nuclear
 * item is the NSSC/KINAC Annex-2-Category-10 pathway anyway, outside the dual-use
 * Categories 1–9 MOTIE administers).
 */
const KR_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
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
  // sat-bus/apogee carry the sensitive pin. Bare parents listed where a sub-item.
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
 * the NON-sensitive sibling — the bare code SPANS both the sensitive and the
 * non-sensitive sub-items, so pinning it as sensitive is the safe position.
 *
 * Load-bearing: the Korean Annex 2 (= EU Annex I, mirrored in `kr-strategic.ts`)
 * classifies hybrid rocket motors as the BARE `9A009` (no .a/.b split). A bare
 * `9A009` SPANS the sensitive 9A009.a (>1.1 MNs — the MTCR variant), so it is
 * pinned sensitive (§4.5). A TRUE sibling sub-code (`9A009.B`, `1C450.B`) is NOT
 * a parent of any pinned code, so it is NOT pinned. Expects a normalised input.
 * (Today every KR-controlled code is REVIEW regardless; this guard keeps the
 * sensitive CITATION + a future general-licence build honest.)
 */
function isParentOfSensitiveSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    KR_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    KR_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (MTCR/Annex-IV-equivalent)?
 *   PART (1) the Annex-IV-equivalent set — `KR_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `KR_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any pinned sub-code,
 * e.g. the KR corpus's bare `9A009` over `9A009.a`).
 *
 * This floor does NOT change the OUTCOME (every KR-controlled code is REVIEW —
 * Korea has no auto-grantable general licence). It selects the sensitive
 * CITATION (so 9A004/9A106 etc. are precisely pinned vs a generic REVIEW) and
 * keeps the module honest for any future general-licence build.
 */
function isSensitiveFloor(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    KR_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    KR_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfSensitiveSubCode(c)
  );
}

/**
 * The KR-controlled dual-use code carried by a classification, if any.
 * KR control attaches via a declared `eccnEU` (the Korean Annex 2 dual-use
 * numbering is byte-compatible with EU Annex I) OR a declared non-EAR99 `eccnUS`
 * (which, in this corpus, is the Wassenaar/CCL mirror of the same dual-use item
 * Korea transposes). Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is a US control handled by the upstream ITAR gate
 * and is never the KR module's GO concern.
 */
function krControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * KR general licences — DELIBERATELY EMPTY.
 *
 * The Korean comprehensive export licence (포괄수출허가) is an exporter-specific
 * privilege (a designated 자율준수무역거래자 / CP-certified company), NOT a self-
 * executing item+destination general licence — so it cannot be modelled as a
 * `GeneralLicence` whose eligibility is determinable from the engine's item ×
 * destination input. Modelling it as one would risk a false-CLEARED (a GO under
 * a licence we cannot confirm the exporter holds). Per §3/§4.5/§11 the honest
 * M-KR answer is INDIVIDUAL/REVIEW at MOTIE for every controlled item; this
 * empty array makes that explicit (and the unit test pins it empty). If Korea
 * ever publishes a self-executing item+destination general authorisation, it
 * would be added here (with its citation + asOfDate + the sensitive floor).
 */
export const KR_GENERAL_LICENCES: readonly GeneralLicence[] = [];

/**
 * South Korea `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not KR-controlled → NONE/GO.
 *   2. KR-controlled → INDIVIDUAL/REVIEW = individual export licence
 *      (개별수출허가) at MOTIE — for EVERY destination. There is no auto-
 *      grantable general licence (the comprehensive licence is exporter-specific;
 *      see the file header). Sensitive MTCR/Annex-IV-equivalent codes are pinned
 *      with the sensitive citation; the rest carry the generic comprehensive-
 *      licence reason. Zone A ("Ga" region) is noted as context (review
 *      routinely granted) but never produces a GO.
 *
 * There is no member→NCA resolution (MOTIE is the single Korean dual-use
 * authority), so `exporterSeat` is not consulted; authority is always "MOTIE".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Korea applies a near-
 * total RU/BY export ban; Gate 1.6 keeps a KR→RU controlled dual-use export
 * BLOCKED).
 */
export const krOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = krControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Korean strategic control → no KR licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: KR_AUTHORITY,
      reasons: [
        "Gut trägt keinen koreanischen Strategie-Güter-Kontrollcode (Public Notice on Trade of Strategic Items, Annex 2 — MOTIE) — keine koreanische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_PUBLIC_NOTICE],
    };
  }

  // 2. KR-controlled → INDIVIDUAL/REVIEW = individual export licence at MOTIE.
  //    Korea has NO auto-grantable item+destination-only general licence (the
  //    comprehensive licence is an exporter-specific 자율준수무역거래자 / CP-
  //    certified privilege — see the file header), so a controlled item is an
  //    Einzel-/individual export licence (개별수출허가) regardless of destination.
  const isGa = KR_GA_REGION_ZONE_A.has(dest);
  const zoneNote = isGa
    ? `${dest} liegt in der „Ga"-Region (Zone A, ~29 Regime-Partnerstaaten) — die Einzelfallprüfung wird dort i. d. R. zügig/routinemäßig erteilt, ist aber KEINE selbstausführende Allgemeingenehmigung.`
    : `${dest} liegt NICHT in der „Ga"-Region (Zone A); es gilt die reguläre (ggf. verschärfte) MOTIE-Einzelfallprüfung.`;

  const sensitive = isSensitiveFloor(code);
  if (sensitive) {
    // Sensitive MTCR/Annex-IV-equivalent code (e.g. 9A004 space launch vehicles,
    // 9A106.c thrust-vector control) → precisely pinned with the sensitive
    // citation. Korea is in MTCR and reviews satellite/MTCR exports CASE-BY-CASE
    // even to Zone A — never a presumption of clearance (no false-CLEARED, §4.5).
    return {
      outcome: "REVIEW",
      licenceType: "INDIVIDUAL",
      authority: KR_AUTHORITY,
      reasons: [
        `Koreanisch kontrolliertes, besonders sensibles MTCR/Anhang-IV-äquivalentes Gut (${code}) nach ${dest}: Korea ist MTCR-Mitglied und prüft Satelliten-/MTCR-Ausfuhren einzelfallbezogen — auch in die Ga-Region keine pauschale Freigabe. Individuelle Ausfuhrgenehmigung (개별수출허가) bei MOTIE erforderlich (eine evtl. Comprehensive-/포괄수출허가 setzt eine MOTIE-Designierung als 자율준수무역거래자 voraus und ist nicht aus Gut × Ziel ableitbar). ${zoneNote}`,
      ],
      citations: [SRC_PUBLIC_NOTICE, SRC_LICENCE_TYPES, SRC_SENSITIVE_FLOOR],
    };
  }

  // Non-sensitive controlled code → generic comprehensive-licence/exporter-
  // specific REVIEW reason (still INDIVIDUAL/REVIEW; no GO without an exporter-
  // specific comprehensive-licence designation we cannot establish here).
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: KR_AUTHORITY,
    reasons: [
      `Koreanisch kontrolliertes Strategie-Gut (${code}) nach ${dest}: individuelle Ausfuhrgenehmigung (개별수출허가) bei MOTIE erforderlich. Eine Comprehensive-/포괄수출허가 (allgemeine Ausfuhrgenehmigung) ist ein exporteur-spezifisches Vorrecht designierter „self-compliance trader" (자율준수무역거래자) und lässt sich NICHT aus der Kombination Gut × Ziel ableiten — daher kein automatisches GO. ${zoneNote}`,
    ],
    citations: [SRC_PUBLIC_NOTICE, SRC_LICENCE_TYPES, SRC_ZONE_A],
  };
};
