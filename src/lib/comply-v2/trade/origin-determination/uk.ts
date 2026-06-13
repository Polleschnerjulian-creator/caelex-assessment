/**
 * UK origin module (Spec 2026-06-13 §4.2, M-UK) — the OGEL + SIEL licence
 * determination for an exporter seated in the United Kingdom (GB).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a GB-seated exporter, UK export-control law is administered by the ECJU
 * (Export Control Joint Unit). Post-Brexit the UK assimilated the EU dual-use
 * framework: the UK Strategic Export Control List bundles the assimilated
 * Council Reg (EC) 428/2009 Annex I (dual-use, codes BYTE-IDENTICAL to the EU
 * Annex I — `9A004`, `5A002`, …), plus the UK Military List + national PL
 * controls. The general licences are Open General Export Licences (OGELs,
 * registration-based at the ECJU via SPIRE); the individual licence is a SIEL
 * (Standard Individual Export Licence). This module decides, for a given
 * classified item × destination:
 *   • item not UK-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled AND the OGEL covers item×destination → GENERAL/GO under the
 *     OGEL (with its registration conditions), authority = ECJU.
 *   • controlled + no OGEL covers it → INDIVIDUAL/REVIEW = SIEL at the ECJU.
 *
 * CRITICAL (post-Brexit): a UK→EU dual-use transfer is NOT intra-EU free
 * movement — it is a UK export needing a UK licence in its own right. The
 * EU-member-states OGEL is exactly the instrument that covers it (minus its
 * exclusions); everything outside that OGEL is a SIEL.
 *
 * ─── Which OGEL is modelled (curated from the official source) ─────────────
 * OGEL "Export of Dual-Use items to EU Member States" (dated 16 Dec 2025,
 * granted by the Secretary of State, ECJU). SCHEDULE 1 (for exports FROM GB —
 * England/Wales/Scotland): "all entries specified by Annex I of the Regulation,
 * OTHER THAN those specified by Annex IIg of the Regulation." SCHEDULE 2 (GB
 * destinations): the EU-27 member states + the Channel Islands + Iceland.
 * Conditions: SPIRE registration before first use, an export-documentation note
 * / the GBOGE licence reference on the customs declaration, three-year record-
 * keeping (Art. 29 of the Export Control Order 2008), and the catch-all
 * WMD/missile end-use exclusion (paras 3(1)-(3)).
 *
 * The OGEL covers exports to the EU MEMBER STATES (+ Channel Islands + Iceland)
 * ONLY. There is NO UK OGEL covering general dual-use exports to the close
 * allies (US/JP/AU/CA/NZ/NO/CH) — verified against the gov.uk OGEL collection.
 * So a UK→US/JP/… dual-use export, however friendly the destination, has no
 * general licence and falls to a SIEL (INDIVIDUAL/REVIEW). This is the key
 * difference from the EU module's EU001 (whose friendly-destination set DOES
 * include US/JP/…) — do NOT assume UK symmetry.
 *
 * ─── The Annex IIg EXCLUSION list (= EU 2021/821 Section I, byte-identical) ─
 * Annex IIg of the retained Reg (EC) 428/2009 (legislation.gov.uk/eur/2009/428/
 * annex/IIg) has EXACTLY two parts, BYTE-IDENTICAL to the EU 2021/821 Annex II
 * Section I list the sibling `eu.ts` models:
 *   (1) "all items specified in Annex IV" (the most-sensitive list; its Cat-9
 *       members include 9A004 space launch vehicles + 9A106.c thrust-vector
 *       control — confirmed at legislation.gov.uk/eur/2009/428/annex/IV); and
 *   (2) the 13 EXPLICIT codes: 0C001, 0C002, 0D001, 0E001, 1A102, 1C351, 1C353,
 *       1C354, 1C450.a.1, 1C450.a.2, 7E104, 9A009.a, 9A117.
 * A UK-controlled item whose code falls in EITHER part — or whose Annex-IIg
 * status cannot be cleanly determined (a bare parent code whose Annex IV
 * sub-item overlaps) — is NOT OGEL-eligible: INDIVIDUAL/REVIEW = SIEL at the
 * ECJU (fail-closed §4.5, NO guessed GO).
 *
 * The other UK dual-use OGELs (low value, after-repair/replacement, after
 * exhibition, technology-for-dual-use, information-security, PCBs, chemicals,
 * cryptographic development, oil & gas, the narrow item-specific India OGEL)
 * require per-shipment facts (value, prior-export linkage, an enumerated narrow
 * item set, etc.) that this destination/item-only input cannot establish → they
 * are NOT auto-granted here; their non-coverage falls through to the SIEL/REVIEW
 * default (the operator can still claim them manually). This keeps every GO this
 * module emits backed by an OGEL whose item×destination eligibility IS
 * determinable (the EU-member-states OGEL).
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * For a GB seat, `dualUsePrimary = militaryPrimary = UK_STRATEGIC`. Until M-UK
 * the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a GB-seat
 * controlled export (REGIME_MATURITY UK_STRATEGIC = 3). M-UK lifts it to 2 and
 * registers this module; Gate 4.5 stops firing for GB. The module's GENERAL/GO
 * supersedes the generic Gate-3.5 (`ACTUAL_CODE_DECLARED`) / Gate-4 BAFA REVIEW
 * for the SAME dual-use leg (the wiring removes those generic rows on a GENERAL
 * verdict). A GB→EU-member OGEL-eligible item therefore becomes GO; a GB→US/JP/…
 * or an Annex-IIg-excluded item stays REVIEW (SIEL). Hard destination
 * prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM and are NEVER
 * reached here as GO — the wiring skips this module when a hard prohibition
 * already blocks.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.gov.uk/government/publications/open-general-export-licence-export-of-dual-use-items-to-eu-member-states — OGEL landing page
 * @see https://assets.publishing.service.gov.uk/media/6937fbac6a12691d48491c34/open-general-export-licence-export-of-dual-use-items-to-eu-member-states.pdf — OGEL text (16 Dec 2025): Schedule 1 (items), Schedule 2 (destinations), conditions
 * @see https://www.legislation.gov.uk/eur/2009/428/annex/IIg — retained Reg (EC) 428/2009 Annex IIg (the OGEL exclusion)
 * @see https://www.legislation.gov.uk/eur/2009/428/annex/IV — retained Reg (EC) 428/2009 Annex IV (confirms 9A004/9A106.c)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";
import { evaluateGeneralLicence } from "./types";
import { EU27_MEMBER_STATES } from "../eu-member-states";

/** The issuing/competent authority for UK strategic export controls. */
const UK_AUTHORITY = "ECJU";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_OGEL_LANDING =
  "https://www.gov.uk/government/publications/open-general-export-licence-export-of-dual-use-items-to-eu-member-states — OGEL (Export of Dual-Use items to EU Member States)";
const SRC_OGEL_TEXT =
  "https://assets.publishing.service.gov.uk/media/6937fbac6a12691d48491c34/open-general-export-licence-export-of-dual-use-items-to-eu-member-states.pdf — OGEL text (16 Dec 2025): Schedule 1 (items: Annex I except Annex IIg), Schedule 2 (destinations: EU-27 + Channel Islands + Iceland), conditions";
/** Retained Reg (EC) 428/2009 Annex IIg — the OGEL exclusion list. */
const SRC_ANNEX_IIG =
  "https://www.legislation.gov.uk/eur/2009/428/annex/IIg — retained Reg (EC) 428/2009 Annex IIg (OGEL exclusion = 'all items in Annex IV' + 13 explicit codes)";
/** Retained Reg (EC) 428/2009 Annex IV — confirms 9A004/9A106.c are members. */
const SRC_ANNEX_IV =
  "https://www.legislation.gov.uk/eur/2009/428/annex/IV — retained Reg (EC) 428/2009 Annex IV (9A004 space launch vehicles, 9A106.c TVC are members)";

/** OGEL freshness as-of (verification date against the 16 Dec 2025 edition). */
export const UK_OGEL_AS_OF = "2026-06-13";

/**
 * OGEL "Export of Dual-Use items to EU Member States" Schedule 2 destinations
 * (for exports FROM Great Britain), ISO-2.
 *
 * Schedule 2 = the EU-27 member states + the Channel Islands + Iceland. The
 * EU-27 set is reused from `EU27_MEMBER_STATES` (single-sourced); Iceland (IS)
 * and the Channel Islands (Jersey JE, Guernsey GG — also covers Alderney/Sark
 * under Guernsey's bailiwick) are added explicitly. NOTE: the Isle of Man (IM)
 * is in Schedule 3 (exports from Northern Ireland), NOT Schedule 2, so it is
 * NOT a GB-export destination here — and the matrix never uses it.
 *
 * Deliberately NARROWER than the EU module's EU001 friendly set: it does NOT
 * include US/JP/AU/CA/NZ/NO/CH — there is no UK OGEL covering general dual-use
 * to the close allies (verified against the gov.uk OGEL collection).
 */
export const UK_OGEL_EU_DESTINATIONS: ReadonlySet<string> = new Set([
  ...EU27_MEMBER_STATES,
  "IS", // Iceland (Schedule 2)
  "JE", // Jersey (Channel Islands)
  "GG", // Guernsey (Channel Islands)
]);

/**
 * Annex IIg exclusion — PART (2): the 13 EXPLICIT codes.
 *
 * Verbatim from legislation.gov.uk/eur/2009/428/annex/IIg — BYTE-IDENTICAL to
 * the EU 2021/821 Annex II Section I explicit list (the UK assimilated the same
 * regime). Stored normalised (UPPERCASE) for comparison. The matcher
 * (`matchesCode`) is sub-precise: `9A009.A` excludes only the .a branch (NOT
 * .b); `1C450.A.1`/`1C450.A.2` only those two salts (NOT bare 1C450).
 */
const ANNEX_IIG_EXPLICIT_CODES: readonly string[] = [
  "0C001", // natural/depleted uranium or thorium
  "0C002", // special fissile materials (other than those in Annex IV)
  "0D001", // software for Cat-0 goods (re 0C001/excluded 0C002)
  "0E001", // technology for Cat-0 goods (re 0C001/excluded 0C002)
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
 * Annex IIg exclusion — PART (1): the Annex IV (retained 428/2009) member set.
 *
 * Annex IIg excludes "all items specified in Annex IV". This is the SAME most-
 * sensitive list the EU module models (the UK assimilated it identically), so
 * the member codes below mirror `eu.ts`'s `EU001_ANNEX_IV_EXCLUDED_PREFIXES`
 * exactly (verified against legislation.gov.uk/eur/2009/428/annex/IV). Where
 * Annex IV lists a SUB-item of a parent, BOTH the precise sub-code AND its bare
 * parent stem are listed: a declared bare parent (e.g. "9A106") cannot be
 * cleanly confirmed to sit OUTSIDE the Annex-IV sub-item, so it is excluded
 * fail-closed (§4.5). This is why golden 9A004 (sat-bus) and 9A106 (apogee-
 * engine) correctly STAY REVIEW for a GB seat.
 *
 * For Category 0, the whole category is treated excluded by the `0` stem (a
 * Cat-0 nuclear item is never OGEL-eligible anyway).
 */
const ANNEX_IV_EXCLUDED_PREFIXES: readonly string[] = [
  // Category 0 (NSG) — whole category is in Annex IV. Stem-match = safe.
  "0",
  // Category 1 — Annex IV members (stealth + strategic + NSG).
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
  // Category 3 — Annex IV members (strategic + NSG).
  "3A228", // switching devices (cold-cathode / spark-gaps)
  "3A229", // high-current pulse generators
  "3A231", // neutron generator systems
  "3A232", // multipoint initiation systems
  "3E201", // technology for 3A228/3A229/3A231/3A232
  // Category 5 part 2 — Annex IV cryptanalysis members. Bare parents listed too.
  "5A004.A", // cryptanalytic equipment
  "5A004", // bare parent → fail-closed
  "5D002.A.3", // software for 5A004.a/.b
  "5D002.C.3", // software functioning as 5A004.a/.b
  "5D002", // bare parent → fail-closed
  "5E002.A", // technology for 5A004.a / 5D002.a.3 / 5D002.c.3
  "5E002", // bare parent → fail-closed
  // Category 6 — Annex IV members (acoustics + radar XS + NSG).
  "6A001", // acoustics (multiple Annex-IV sub-items) — stem-match = safe
  "6A203", // streak/framing cameras
  "6A225", // velocity interferometers
  "6A226", // pressure sensors
  "6B008", // pulse radar cross-section systems
  "6B108", // radar XS systems usable for missiles
  "6D003.A", // software for real-time acoustic-data processing
  "6D003", // bare parent → fail-closed
  // Category 7 — Annex IV MTCR-technology members.
  "7A117", // guidance sets usable in missiles
  "7B001", // test/cal/alignment equipment for 7A117
  "7B003", // production equipment for 7A117
  "7B103", // production facilities for 7A117
  "7D101", // software for 7B003/7B103
  "7E001", // technology for 7A117/7B003/7B103/7D101 development
  "7E002", // technology for 7A117/7B003/7B103 production
  "7E101", // technology for 7A117/7B003/7B103/7D101 use
  // Category 8 — Annex IV members.
  "8A002.O.3", // noise-reduction systems for vessels ≥1000 t
  "8A002", // bare parent → fail-closed
  "8E002.A", // technology for underwater-noise-reduction propellers
  "8E002", // bare parent → fail-closed
  // Category 9 — Annex IV MTCR-technology members. CRITICAL: 9A004 (space launch
  // vehicles) + 9A106.c (thrust-vector control) are HERE — golden sat-bus/apogee
  // stay fail-closed REVIEW. Bare parents listed where Annex IV lists a sub-item.
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
 * This is load-bearing: the UK Dual-Use List (= EU Annex I) classifies hybrid
 * rocket motors as the BARE `9A009` (no .a/.b split). Without this guard a
 * 9A009.a-class motor (>1.1 MNs — the Annex-IIg-excluded MTCR variant) declared
 * as bare `9A009` would wrongly clear under the OGEL: a false-CLEARED on rocket
 * propulsion. So a bare parent is treated Annex-IIg-excluded (§4.5). A TRUE
 * sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any excluded code,
 * so it is unaffected and stays OGEL-eligible. Expects a normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    ANNEX_IIG_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    ANNEX_IV_EXCLUDED_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the Annex IIg exclusion list?
 *   PART (1) "all items specified in Annex IV"  — `ANNEX_IV_EXCLUDED_PREFIXES`
 *   PART (2) the 13 explicit Annex-IIg codes    — `ANNEX_IIG_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded
 * sub-code, e.g. the corpus's bare `9A009` over `9A009.a`).
 * (Retained Reg (EC) 428/2009 Annex IIg + Annex IV.)
 */
function isAnnexIIgExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    ANNEX_IIG_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    ANNEX_IV_EXCLUDED_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The UK-controlled dual-use code carried by a classification, if any.
 * UK control attaches via a declared `eccnEU` (the UK Dual-Use List is byte-
 * identical to EU Annex I) OR a declared non-EAR99 `eccnUS` (which, in this
 * corpus, is the Wassenaar/CCL mirror of the same Annex I dual-use item the UK
 * assimilated). Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is a US control handled by the upstream ITAR gate
 * and is never OGEL-eligible.
 */
function ukControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * The OGEL (Export of Dual-Use items to EU Member States) as a `GeneralLicence`
 * for the generic evaluator. `eligibleCodes` = the item carries a UK-controlled
 * code that is NOT on the Annex IIg exclusion list. `eligibleDestinations` =
 * the OGEL Schedule-2 set (EU-27 + Channel Islands + Iceland). There are no
 * destination-specific exclusions beyond the allow-set (the OGEL is a positive
 * allow-list), so `excludedDestinations` is empty.
 */
export const OGEL_DUAL_USE_EU: GeneralLicence = {
  id: "OGEL_DUAL_USE_EU",
  label:
    "OGEL (Export of Dual-Use items to EU Member States) — UK open general export licence",
  authority: UK_AUTHORITY,
  eligibleCodes: (c) => {
    const code = ukControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream, not via the OGEL
    return !isAnnexIIgExcluded(code);
  },
  eligibleDestinations: UK_OGEL_EU_DESTINATIONS,
  excludedDestinations: new Set<string>(),
  conditions: [
    "Vor der ersten Nutzung bei der ECJU über SPIRE registrieren (Export Control Order 2008, Art. 28).",
    "Auf der Ausfuhrdokumentation einen Vermerk auf die OGEL bzw. die SPIRE-Lizenzreferenz (Form 'GBOGE 20XX/XXXXX') führen und diese in die UK-Zollanmeldung eintragen.",
    "Aufzeichnungen über jede Ausfuhr/Verbringung mindestens drei Jahre aufbewahren (Export Control Order 2008, Art. 29).",
    "Keine Nutzung, wenn die Güter (ganz oder teilweise) für WMD-/Trägerwaffen-Zwecke bestimmt sind oder der Exporteur entsprechende Anhaltspunkte hat (OGEL Para 3(1)-(3) Catch-all).",
  ],
  citation: SRC_OGEL_TEXT,
  asOfDate: UK_OGEL_AS_OF,
};

/** All curated UK general licences (space-relevant). Currently the EU-member-
 * states OGEL — see file header for why the other OGELs are not auto-granted. */
export const UK_GENERAL_LICENCES: readonly GeneralLicence[] = [
  OGEL_DUAL_USE_EU,
];

/**
 * UK `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not UK-controlled → NONE/GO.
 *   2. UK-controlled + the OGEL covers item×destination → GENERAL/GO under the
 *      OGEL (authority ECJU).
 *   3. UK-controlled + no OGEL covers it → INDIVIDUAL/REVIEW = SIEL at the ECJU.
 *
 * There is no member→NCA resolution (the ECJU is the single UK authority), so
 * `exporterSeat` is not consulted; authority is always "ECJU".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM
 * by the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks.
 */
export const ukOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = ukControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under UK strategic control → no UK licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: UK_AUTHORITY,
      reasons: [
        "Gut trägt keinen UK-Kontrollcode (UK Strategic Export Control List, Dual-Use Annex I) — keine UK-Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_OGEL_LANDING],
    };
  }

  // 2. UK-controlled + the OGEL covers item×destination → GENERAL/GO.
  const covering = UK_GENERAL_LICENCES.find((lic) =>
    evaluateGeneralLicence(lic, classification, destinationCountry),
  );
  if (covering) {
    return {
      outcome: "GO",
      licenceType: "GENERAL",
      authority: UK_AUTHORITY,
      generalLicence: {
        id: covering.id,
        label: covering.label,
        conditions: covering.conditions,
      },
      reasons: [
        `UK-kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: die ${covering.id} (Export of Dual-Use items to EU Member States) greift — kein SIEL-Einzelantrag nötig, sofern die Auflagen erfüllt sind (SPIRE-Registrierung etc.).`,
      ],
      citations: [SRC_OGEL_LANDING, covering.citation],
    };
  }

  // 3. UK-controlled + no OGEL covers it → INDIVIDUAL/REVIEW = SIEL at the ECJU.
  //    Either the destination is outside the OGEL Schedule-2 set (no UK OGEL to
  //    the close allies — a post-Brexit UK→US/JP export is still licensable), or
  //    the code is on the Annex IIg exclusion list (incl. "all items in Annex
  //    IV" — e.g. 9A004/9A106.c MTCR launch tech).
  const excluded = isAnnexIIgExcluded(code);
  const reasonDetail = excluded
    ? `Code ${code} steht auf der Annex-IIg-Ausschlussliste der OGEL (retained Reg (EC) 428/2009 Annex IIg — inkl. „alle in Annex IV genannten Güter", z. B. 9A004) und ist von keiner OGEL gedeckt.`
    : `Für ${dest} greift keine UK-OGEL (die Dual-Use-OGEL deckt nur EU-Mitgliedstaaten, die Kanalinseln und Island; es gibt keine UK-OGEL für die nahen Verbündeten).`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: UK_AUTHORITY,
    reasons: [
      `UK-kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Standard Individual Export Licence (SIEL) bei der ECJU erforderlich.`,
    ],
    citations: excluded
      ? [SRC_OGEL_TEXT, SRC_ANNEX_IIG, SRC_ANNEX_IV]
      : [SRC_OGEL_LANDING, SRC_OGEL_TEXT],
  };
};
