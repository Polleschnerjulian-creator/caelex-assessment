/**
 * India origin module (Spec 2026-06-13 §4.2, M-IN) — the SCOMET licence
 * determination for an exporter seated in India (IN).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For an IN-seated exporter, Indian export-control law is administered by the
 * DGFT (Directorate General of Foreign Trade, Ministry of Commerce).
 * Authorisation flows from the Foreign Trade (Development and Regulation) Act,
 * 1992 ("FT(D&R) Act"), implemented through the Foreign Trade Policy and DGFT
 * SCOMET Notifications. The strategic-goods control list is the SCOMET List
 * (Special Chemicals, Organisms, Materials, Equipment and Technologies),
 * Appendix 3 to Schedule 2 of the ITC(HS) Classifications (DGFT Notification
 * No. 25 dated 02.09.2024, in force 02.10.2024). SCOMET's 9 categories (0-8) map
 * to the international lists; the space spine sits in Category 5 (Aerospace /
 * MTCR — SLVs, sounding rockets, rocket systems) and Category 8 (the Wassenaar-
 * aligned dual-use category — 8A904 spacecraft/SLV/bus = EU 9A004, propulsion,
 * sensors). India is a member of MTCR, the Wassenaar Arrangement and the
 * Australia Group (NOT the NSG), so its SCOMET codes are Wassenaar/MTCR/AG-
 * aligned and byte-comparable to EU Annex I for the dual-use space slice.
 *
 * This module decides, for a given classified item × destination:
 *   • item not SCOMET-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled → INDIVIDUAL/REVIEW = an individual SCOMET authorisation at the
 *     DGFT (for every destination on the space spine — see the next block).
 *
 * ─── Why there is NO item+destination-only general-licence GO (the honest IN
 *     posture, verified against the official source) ─────────────────────────
 * Unlike the EU (EUGEA EU001), the UK (the EU-member-states OGEL) and CH (the
 * OGB), India has NO general/open authorisation that an item × destination input
 * ALONE makes auto-grantable for the space spine. MOST SCOMET exports require an
 * INDIVIDUAL authorisation. The DGFT general/open authorisations that DO exist
 * are narrow + condition-heavy and turn on per-shipment / end-use / end-user /
 * intra-company facts this module's input cannot establish:
 *   • GAICT (Global Authorisation for Intra-Company Transfer, DGFT Public Notice
 *     07.09.2024) — the intra-company instrument: transfer of 36 selected SCOMET
 *     items to affiliates in 41 countries, 3-year validity, conditional on a
 *     parent-subsidiary/affiliated relationship + an Internal Compliance
 *     Programme. Its 36-item list does NOT include Cat-5 aerospace or
 *     9A004-class spacecraft/launch vehicles — so the space spine is out of
 *     scope AND it is not an item+destination-only fact.
 *   • GAET (General Authorisation for Export of Telecommunication items, SCOMET
 *     Category 8A5 Part 1) — telecom items only, conditional on end-use/end-user
 *     and registration (NOT "technology", NOT the intra-company instrument, and
 *     not auto-grantable from code + destination alone).
 *   • GAEIS (General Authorisation for Export of Information Security items,
 *     SCOMET Category 8A5 Part 2) — info-security / cryptography items only,
 *     conditional on end-use / end-user and registration (not auto-grantable
 *     from the code + destination alone).
 *   • GAED (General Authorisation for Export of certain Drones, Notification
 *     14/2023-DGFT) — civilian UAVs with range ≤ 25 km AND payload ≤ 25 kg,
 *     excluding software/technology; no space-spine item qualifies.
 * Like the EU's EU002-008, the UK's narrow OGELs and the Swiss AGB, their
 * non-coverage simply falls through to the INDIVIDUAL/REVIEW default — the
 * operator can still claim them manually at the DGFT once the per-shipment facts
 * exist. So `IN_GENERAL_LICENCES` is intentionally EMPTY: every SCOMET-controlled
 * space-spine export is an individual authorisation (REVIEW). This is the correct
 * and valuable answer (§2 rubric: "never wrong, NOT never REVIEW") — a cited,
 * origin-specific REVIEW naming the DGFT, NOT a guessed GO (§4.5).
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (no false-CLEARED, §4.5) — a SAFETY belt ──
 * Because `IN_GENERAL_LICENCES` is empty, a controlled item is already REVIEW for
 * every destination, so the floor is not load-bearing for the current verdicts.
 * It is carried anyway (mirroring M-CH) as a fail-closed BELT: should a future
 * curation ever add a covering Indian general authorisation, the most-sensitive
 * MTCR/Annex-IV-equivalent codes (9A004 space launch vehicles, 9A106.c thrust-
 * vector control) must NEVER become eligible. India transposes the IDENTICAL
 * international control lists (Wassenaar/MTCR/AG) the EU/UK do, so the floor
 * reuses the EXACT EU/UK-verified exclusion set (EU 2021/821 Annex II Section I =
 * retained Reg 428/2009 Annex IIg, byte-identical): "all items in Annex IV" + the
 * 13 explicit codes, plus the fail-closed bare-PARENT guard. This guarantees that
 * golden sat-bus (9A004) and apogee-engine (9A106) STAY REVIEW for every IN
 * destination under any future evolution of this module — never a guessed GO.
 *
 * ─── Engine interaction (§4.3) ─────────────────────────────────────────────
 * For an IN seat, `dualUsePrimary = IN_SCOMET`, `militaryPrimary = null`. Until
 * M-IN the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for an
 * IN-seat controlled export (REGIME_MATURITY IN_SCOMET = 3). M-IN lifts it to 2
 * and registers this module; Gate 4.5 stops firing for IN. Because this module
 * emits NO GENERAL verdict (no general-licence GO on the spine), it produces NO
 * REVIEW→GO refinement — it replaces the generic Gate-4.5 thin-origin REVIEW with
 * a PRECISE, cited "individual SCOMET authorisation at the DGFT" REVIEW for the
 * SAME controlled cells. The golden-set distribution is therefore UNCHANGED for
 * IN-origin cells (every controlled cell stays REVIEW; uncontrolled stays GO);
 * the value is the precision + the citation. Hard destination prohibitions
 * (embargo / RU-BY / ITAR) are decided UPSTREAM by the engine gates and are
 * never reached here as GO — the wiring skips this module when a hard prohibition
 * already blocks (Gate 1.6 keeps an IN→RU controlled dual-use export BLOCKED). An
 * item bearing a US ECCN (eccnUS) also carries an independent US/BIS leg the
 * module does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.dgft.gov.in/CP/?opt=scomet-list — DGFT SCOMET List (Foreign Trade Policy Schedule-2 Appendix 3)
 * @see https://content.dgft.gov.in/Website/UPDATED%20SCOMET%20List%202024%20as%20on%2002.09.2024.pdf — Appendix-3 SCOMET List 2024 (Notification 25, 02.09.2024)
 * @see https://commerce.gov.in/about-us/divisions/foreign-trade/ — Foreign Trade (Development & Regulation) Act, 1992 (DGFT authorisation basis)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";

/** The issuing/competent authority for Indian strategic export controls. */
const IN_AUTHORITY = "DGFT";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_SCOMET =
  "https://www.dgft.gov.in/CP/?opt=scomet-list — DGFT SCOMET List (Foreign Trade Policy Schedule-2 Appendix 3); individual SCOMET authorisation required for controlled exports";
const SRC_FT_DR_ACT =
  "https://commerce.gov.in/about-us/divisions/foreign-trade/ — Foreign Trade (Development and Regulation) Act, 1992 (the DGFT authorisation basis)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; India transposes the same
 * Wassenaar/MTCR/AG lists). This is the SAFETY-floor source, used so no future
 * general-licence addition could ever clear 9A004/9A106.
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list India mirrors via Wassenaar/MTCR/AG); used as the no-false-CLEARED safety floor for any future Indian general authorisation";

/** SCOMET freshness as-of (verification date against the SCOMET List 2024). */
export const IN_SCOMET_AS_OF = "2026-06-13";

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). India transposes the identical Wassenaar/MTCR/AG
 * lists, so the SAME most-sensitive codes that the EU/UK exclude from their
 * self-executing general licences are the ones any future Indian general
 * authorisation must not be confirmed to cover → fail-close. Stored normalised
 * (UPPERCASE). The matcher (`matchesCode`) is sub-precise: `9A009.A` excludes
 * only the .a branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts
 * (NOT bare 1C450).
 */
const IN_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. India mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/AG), so the member codes below mirror the
 * EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly. Where Annex IV lists a SUB-item of
 * a parent, BOTH the precise sub-code AND its bare parent stem are listed: a
 * declared bare parent (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE
 * the sensitive sub-item, so it fail-closes (§4.5). This is why golden 9A004
 * (sat-bus) and 9A106 (apogee-engine) STAY REVIEW for an IN seat — and would stay
 * REVIEW even under a future module evolution that added a covering licence.
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (Cat-0
 * nuclear items go via DAE clearance, never a general authorisation anyway).
 */
const IN_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
  // Category 0 (nuclear) — whole category. Stem-match = safe.
  "0",
  // Category 1 — Annex-IV-equivalent members (stealth + strategic + nuclear).
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
  // Category 3 — Annex-IV-equivalent members (strategic + nuclear).
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
  // Category 6 — Annex-IV-equivalent members (acoustics + radar XS + nuclear).
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
 * This is the SAME load-bearing guard the EU/UK/CH modules carry: the SCOMET /
 * mirrored corpus classifies hybrid rocket motors as the BARE `9A009` (no .a/.b
 * split). The guard ensures a 9A009.a-class motor (>1.1 MNs — the sensitive MTCR
 * variant) declared as bare `9A009` could never clear under any future Indian
 * general authorisation: a false-CLEARED on rocket propulsion is forbidden
 * (§4.5). A TRUE sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any
 * excluded code, so it is unaffected. Expects a normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    IN_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    IN_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor?
 *   PART (1) the Annex-IV-equivalent set — `IN_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `IN_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the corpus's bare `9A009` over `9A009.a`).
 *
 * This floor is the no-false-CLEARED safety position carried as a belt: should a
 * future curation add a covering Indian general authorisation, these most-
 * sensitive MTCR/Annex-IV-equivalent codes must never become eligible. For the
 * CURRENT module (no general licence on the spine) every controlled item is
 * REVIEW regardless, so the floor changes no verdict today — it only annotates
 * the reason for the sensitive codes.
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    IN_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    IN_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The SCOMET-controlled code carried by a classification, if any.
 * SCOMET control attaches via a declared `eccnEU` (India's SCOMET dual-use space
 * slice is Wassenaar/MTCR/AG-aligned and byte-comparable to EU Annex I) OR a
 * declared non-EAR99 `eccnUS` (which, in this corpus, is the Wassenaar/CCL mirror
 * of the same dual-use item India transposes into SCOMET). Returns the operative
 * code (eccnEU preferred), else null. USML/ITAR (`usmlCategory`) is a US control
 * handled by the upstream ITAR/DDTC gate and is never an Indian-licence concern.
 */
function inControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * All curated IN general licences (space-relevant) — INTENTIONALLY EMPTY.
 *
 * India's general/open authorisations (GAICT intra-company transfer, GAET
 * telecom items, GAEIS information-security, GAED civilian drones) all require
 * per-shipment / end-use / end-user / intra-company facts an item+destination-only
 * input cannot establish, so NONE is auto-grantable here (see the file header for
 * the exact instruments). Their non-coverage falls through to
 * the INDIVIDUAL/REVIEW default (the operator can still claim them manually at
 * the DGFT). Keeping this empty pins the honest IN posture: every SCOMET-
 * controlled space-spine export is an individual authorisation (REVIEW), never a
 * guessed general-licence GO (§4.5).
 */
export const IN_GENERAL_LICENCES: readonly GeneralLicence[] = [];

/**
 * India `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not SCOMET-controlled → NONE/GO.
 *   2. SCOMET-controlled → INDIVIDUAL/REVIEW = individual SCOMET authorisation at
 *      the DGFT (there is no item+destination-only general authorisation that
 *      covers the space spine — GAICT/GAET/GAEIS/GAED are conditional, not modelled
 *      here; the sensitive MTCR/Annex-IV-equivalent codes additionally carry the
 *      fail-closed floor annotation).
 *
 * There is no member→NCA resolution (the DGFT is the single Indian authority), so
 * `exporterSeat` is not consulted; authority is always "DGFT".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Gate 1.6 keeps an
 * IN→RU controlled dual-use export BLOCKED).
 */
export const inOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = inControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under SCOMET → no Indian export authorisation required.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: IN_AUTHORITY,
      reasons: [
        "Gut trägt keinen SCOMET-Kontrollcode (DGFT SCOMET List, Appendix 3 zu Schedule 2 ITC(HS)) — keine indische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_SCOMET],
    };
  }

  // 2. SCOMET-controlled → INDIVIDUAL/REVIEW = individual SCOMET authorisation at
  //    the DGFT. There is no item+destination-only general authorisation: the
  //    DGFT general authorisations (GAICT intra-company / GAET telecom / GAEIS
  //    info-security / GAED civilian drones) are intra-company / end-use /
  //    registration conditional and not auto-grantable here, so every
  //    controlled space-spine export needs an individual licence. The most-
  //    sensitive MTCR/Annex-IV-equivalent codes (9A004/9A106.c) additionally sit
  //    on the fail-closed floor — they could never clear under any future
  //    general authorisation (§4.5, no false-CLEARED).
  const sensitive = isSensitiveExcluded(code);
  const sensitiveNote = sensitive
    ? ` Code ${code} ist ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut (SCOMET Cat 5/8A9) — eine General-Authorisation kommt dafür ohnehin nicht in Betracht; DRDO/DAE/ISRO-Mitbeteiligung im Inter-Ministerial-Working-Group-Verfahren ist üblich.`
    : ` Die DGFT-General-Authorisations (GAICT konzerninterner Transfer, GAET Telekommunikation, GAEIS Informationssicherheit, GAED zivile Drohnen) sind bedingungs-/endverwendungs-/konzernabhängig und aus Item×Ziel allein nicht automatisch erteilbar.`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: IN_AUTHORITY,
    reasons: [
      `SCOMET-kontrolliertes Gut (${code}) nach ${dest}: individuelle SCOMET-Ausfuhrgenehmigung beim DGFT erforderlich (Foreign Trade (Development and Regulation) Act 1992; SCOMET List, Appendix 3 zu Schedule 2 ITC(HS)).${sensitiveNote}`,
    ],
    citations: sensitive
      ? [SRC_SCOMET, SRC_FT_DR_ACT, SRC_SENSITIVE_FLOOR]
      : [SRC_SCOMET, SRC_FT_DR_ACT],
  };
};
