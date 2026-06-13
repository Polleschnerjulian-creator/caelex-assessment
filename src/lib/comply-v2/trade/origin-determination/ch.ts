/**
 * Switzerland origin module (Spec 2026-06-13 §4.2, M-CH) — the OGB + individual
 * licence determination for an exporter seated in Switzerland (CH).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For a CH-seated exporter, Swiss export-control law is the Güterkontroll-
 * verordnung (GKV, SR 946.202.1), administered by SECO (Staatssekretariat für
 * Wirtschaft). Switzerland is NOT an EU/EEA member; a CH-origin dual-use export
 * needs a Swiss licence in its own right. Switzerland transposes the SAME
 * international control lists (Wassenaar/MTCR/NSG/AG) as the EU — its
 * Exportkontrollnummern (EKN) are byte-identical to EU Annex I (`9A004`,
 * `5A002`, …; see `ch-gkv.ts`). The general licence is the OGB (ordentliche
 * Generalausfuhrbewilligung); the individual licence is an Einzelausfuhr-
 * bewilligung. This module decides, for a given classified item × destination:
 *   • item not CH-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled AND the OGB covers item×destination → GENERAL/GO under the OGB
 *     (with its registration/reporting conditions), authority = SECO.
 *   • controlled + no OGB covers it → INDIVIDUAL/REVIEW = Einzelbewilligung at
 *     SECO.
 *
 * ─── Which general licence is modelled (curated from the official source) ──
 * The OGB (GKV Art. 12(1)): "Für die Ausfuhr von Gütern, die in Anhang 2 Teil 2
 * [DUAL-USE], Anhang 3 oder 5 aufgeführt sind, nach Staaten, die sich an allen
 * von der Schweiz unterstützten völkerrechtlich nicht verbindlichen
 * internationalen Kontrollmassnahmen beteiligen, kann das SECO eine ordentliche
 * Generalausfuhrbewilligung (OGB) erteilen." The partner states are the list in
 * ANHANG 7. Conditions: a one-time SECO application + the standard OGB regime
 * (the two-year validity per Art. 14, the reporting/record-keeping duties, and
 * the Art. 3(4) ABC catch-all / Art. 6 GKG end-use refusal reservation).
 *
 * The OGB partner set is the ANHANG-7 list (Stand am 1. Juni 2024), VERBATIM:
 * Argentina, Australia, Belgium, Bulgaria, Denmark, Germany, Finland, France,
 * Greece, Ireland, Italy, Japan, Canada, Luxembourg, New Zealand, Netherlands,
 * Norway, Austria, Poland, Portugal, Sweden, Spain, South Korea, Czech Republic,
 * Turkey, Ukraine, Hungary, United Kingdom, USA. CRITICAL: India is NOT on the
 * list, and the 11-state expansion (Iceland + 10 EU members: BG already on /
 * actually CY/EE/HR/LV/LT/MT/RO/SK/SI + IS) takes effect only 1 JULY 2026 — at
 * the 2026-06-13 as-of those 11 are NOT yet partner states, so a CH→IS or
 * CH→Cyprus dual-use export still needs an Einzelbewilligung (do NOT model the
 * future list — fail-closed to the in-force Anhang 7).
 *
 * The AGB (Art. 13, ausserordentliche Generalausfuhrbewilligung) covers the same
 * Anhang 2/3/5 goods to states NOT on Anhang 7, but it is EXPORTER-SPECIFIC
 * (granted per applicant, per-shipment facts) — like the EU's EU002-008 it
 * cannot be auto-granted from item×destination alone, so its non-coverage falls
 * through to the INDIVIDUAL/REVIEW default (the operator can still apply for it).
 * Art. 12(2) (OGB for Anhang 4 STRATEGIC goods to EU members / EU-satnav-
 * cooperation states) is a separate, narrower path on a different annex; the
 * space slice's controlled codes are dual-use (Anhang 2 Teil 2), so it is not
 * the operative licence here. This keeps every GO this module emits backed by
 * the OGB whose item×destination eligibility IS determinable.
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (no false-CLEARED, §4.5) ────────────────
 * UNLIKE the EU EUGEA (Annex II Section I) and the UK OGEL (Annex IIg), the
 * Swiss OGB text carries NO written goods-exclusion schedule (Art. 12-14 list no
 * carve-out for the most-sensitive dual-use goods; the sensitivity assessment
 * happens at the SECO application stage, Art. 27/Art. 6 GKG — genuine authority
 * discretion). Reading Art. 12(1) literally would make EVERY Anhang-2-Teil-2
 * dual-use code (incl. 9A004 space launch vehicles and 9A106.c thrust-vector
 * control) OGB-eligible to a partner state — a false-CLEARED on MTCR space-launch
 * tech, which is CATASTROPHIC and forbidden (§4.5).
 *
 * RESOLUTION (over-strict-but-safe): the most-sensitive MTCR/Annex-IV-equivalent
 * codes are NOT confirmable as OGB-eligible from the text, so they FAIL-CLOSE to
 * an Einzelbewilligung (REVIEW). Switzerland transposes the IDENTICAL
 * international control lists the EU/UK do, so the SAFETY FLOOR reuses the EXACT
 * EU/UK-verified exclusion set (EU 2021/821 Annex II Section I = retained Reg
 * 428/2009 Annex IIg, byte-identical): "all items in Annex IV" + the 13 explicit
 * codes, plus the fail-closed bare-PARENT guard. This is a SAFETY floor (never a
 * guessed GO), NOT a claim that the GKV writes an exclusion schedule — it is the
 * honest "cannot confirm → REVIEW" position the M-CH mandate requires for 9A004/
 * 9A106. So golden sat-bus (9A004) and apogee-engine (9A106) correctly STAY
 * REVIEW for every CH destination.
 *
 * ─── Engine interaction (§4.3, the tricky part) ───────────────────────────
 * For a CH seat, `dualUsePrimary = CH_GKV`, `militaryPrimary = null`. Until M-CH
 * the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for a CH-seat
 * controlled export (REGIME_MATURITY CH_GKV = 3). M-CH lifts it to 2 and
 * registers this module; Gate 4.5 stops firing for CH. The module's GENERAL/GO
 * supersedes the generic Gate-3.5 (`ACTUAL_CODE_DECLARED`) / Gate-4 BAFA REVIEW
 * for the SAME dual-use leg (the wiring removes those generic rows on a GENERAL
 * verdict). A CH→Anhang-7 OGB-eligible item therefore becomes GO; a sensitive
 * Annex-IV-equivalent item or a CH→non-partner (IN/CN) export stays REVIEW
 * (Einzelbewilligung). Hard destination prohibitions (embargo / RU-BY / ITAR)
 * are decided UPSTREAM and are NEVER reached here as GO — the wiring skips this
 * module when a hard prohibition already blocks (Switzerland applies the EU-
 * aligned RU/BY sanctions; Gate 1.6 keeps a CH→RU controlled dual-use export
 * BLOCKED). An item bearing a US ECCN (eccnUS) also carries an independent
 * US/BIS leg the module does NOT override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.fedlex.admin.ch/eli/cc/2016/352/de — Güterkontrollverordnung (GKV), SR 946.202.1
 * @see https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2016/352/20240601/de/xml/fedlex-data-admin-ch-eli-cc-2016-352-20240601-de-xml-1.xml — GKV (Stand am 1. Juni 2024): Art. 12-14 + Anhang 7 verbatim
 * @see https://www.seco.admin.ch/seco/de/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/exportkontrollen-und-sanktionen/exportkontrolle_industriegueter/statistik/generalausfuhrbewilligungen.html — SECO Generalausfuhrbewilligungen (confirms the Anhang-7 1 July 2026 expansion is future)
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";
import { evaluateGeneralLicence } from "./types";

/** The issuing/competent authority for Swiss strategic export controls. */
const CH_AUTHORITY = "SECO";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_GKV =
  "https://www.fedlex.admin.ch/eli/cc/2016/352/de — Güterkontrollverordnung (GKV), SR 946.202.1";
const SRC_GKV_ART12 =
  "https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2016/352/20240601/de/xml/fedlex-data-admin-ch-eli-cc-2016-352-20240601-de-xml-1.xml — GKV (Stand am 1. Juni 2024) Art. 12 (OGB) + Anhang 7 (Partnerstaaten, verbatim)";
/**
 * The MTCR/Annex-IV-equivalent + Section-I sensitive-exclusion floor — verified
 * against the EU/UK Annex IV (byte-identical; Switzerland transposes the same
 * lists). This is the SAFETY-floor source, not a claim that the GKV writes an
 * exclusion schedule.
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Switzerland mirrors via Wassenaar/MTCR/NSG/AG); used as the no-false-CLEARED safety floor for the OGB (GKV carries no written exclusion schedule)";

/** OGB freshness as-of (verification date against the GKV Stand 1. Juni 2024). */
export const CH_OGB_AS_OF = "2026-06-13";

/**
 * OGB partner states — GKV Anhang 7 (Staaten nach Artikel 12), Stand am 1. Juni
 * 2024, VERBATIM, as ISO-2.
 *
 * Argentina (AR), Australia (AU), Belgium (BE), Bulgaria (BG), Denmark (DK),
 * Germany (DE), Finland (FI), France (FR), Greece (GR), Ireland (IE), Italy (IT),
 * Japan (JP), Canada (CA), Luxembourg (LU), New Zealand (NZ), Netherlands (NL),
 * Norway (NO), Austria (AT), Poland (PL), Portugal (PT), Sweden (SE), Spain (ES),
 * South Korea (KR), Czech Republic (CZ), Turkey (TR), Ukraine (UA), Hungary (HU),
 * United Kingdom (GB), United States of America (US).
 *
 * NOTE (fail-closed to the in-force list): the 11-state expansion (Iceland IS +
 * the EU members CY/EE/HR/LV/LT/MT/RO/SK/SI) takes effect only 1 JULY 2026 — it
 * is NOT modelled here (the as-of is 2026-06-13). India (IN) is NOT on the list.
 * A CH→non-partner dual-use export needs an Einzelbewilligung.
 */
export const CH_OGB_PARTNER_STATES: ReadonlySet<string> = new Set([
  "AR",
  "AU",
  "BE",
  "BG",
  "DK",
  "DE",
  "FI",
  "FR",
  "GR",
  "IE",
  "IT",
  "JP",
  "CA",
  "LU",
  "NZ",
  "NL",
  "NO",
  "AT",
  "PL",
  "PT",
  "SE",
  "ES",
  "KR",
  "CZ",
  "TR",
  "UA",
  "HU",
  "GB",
  "US",
]);

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Switzerland transposes the identical Wassenaar/MTCR/
 * NSG/AG lists, so the SAME most-sensitive codes that the EU/UK exclude from
 * their self-executing general licences are the ones the Swiss OGB cannot be
 * confirmed to cover → fail-close. Stored normalised (UPPERCASE) for comparison.
 * The matcher (`matchesCode`) is sub-precise: `9A009.A` excludes only the .a
 * branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts (NOT bare 1C450).
 */
const CH_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. Switzerland mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/NSG/AG), so the member codes below mirror
 * the EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly. Where Annex IV lists a SUB-item
 * of a parent, BOTH the precise sub-code AND its bare parent stem are listed: a
 * declared bare parent (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE
 * the sensitive sub-item, so it fail-closes (§4.5). This is why golden 9A004
 * (sat-bus) and 9A106 (apogee-engine) correctly STAY REVIEW for a CH seat.
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (a Cat-0
 * nuclear item is never OGB-eligible anyway — nuclear goods are Anhang 2 Teil 1 /
 * BFE-licensed, outside the OGB's Anhang 2 Teil 2 scope).
 */
const CH_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
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
 * This is load-bearing: the Swiss GKV Anhang 2 Teil 2 (= EU Annex I, mirrored in
 * `ch-gkv.ts`) classifies hybrid rocket motors as the BARE `9A009` (no .a/.b
 * split). Without this guard a 9A009.a-class motor (>1.1 MNs — the sensitive
 * MTCR variant) declared as bare `9A009` would wrongly clear under the OGB: a
 * false-CLEARED on rocket propulsion. So a bare parent fail-closes (§4.5). A TRUE
 * sibling sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any excluded code,
 * so it is unaffected and stays OGB-eligible. Expects a normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    CH_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    CH_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (NOT OGB-eligible)?
 *   PART (1) the Annex-IV-equivalent set — `CH_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `CH_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the CH corpus's bare `9A009` over `9A009.a`).
 *
 * This floor is the no-false-CLEARED safety position for the OGB (the GKV text
 * carries no written exclusion schedule) — the most-sensitive MTCR/Annex-IV-
 * equivalent codes are NOT confirmable as OGB-eligible → Einzelbewilligung.
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    CH_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    CH_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The CH-controlled dual-use code carried by a classification, if any.
 * CH control attaches via a declared `eccnEU` (the Swiss GKV Anhang 2 Teil 2 is
 * byte-identical to EU Annex I) OR a declared non-EAR99 `eccnUS` (which, in this
 * corpus, is the Wassenaar/CCL mirror of the same dual-use item Switzerland
 * transposes). Returns the operative code (eccnEU preferred), else null.
 * USML/ITAR (`usmlCategory`) is a US control handled by the upstream ITAR gate
 * and is never OGB-eligible.
 */
function chControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * The OGB (ordentliche Generalausfuhrbewilligung) as a `GeneralLicence` for the
 * generic evaluator. `eligibleCodes` = the item carries a CH-controlled code
 * that is NOT on the sensitive-exclusion floor. `eligibleDestinations` = the
 * Anhang-7 partner-state set. There are no destination-specific exclusions
 * beyond the allow-set (the OGB is a positive partner-state allow-list), so
 * `excludedDestinations` is empty.
 */
export const CH_OGB: GeneralLicence = {
  id: "CH_OGB",
  label:
    "OGB — Ordentliche Generalausfuhrbewilligung (Swiss general export authorisation, GKV Art. 12)",
  authority: CH_AUTHORITY,
  eligibleCodes: (c) => {
    const code = chControlledCode(c);
    if (!code) return false; // uncontrolled → handled as NONE upstream, not via the OGB
    return !isSensitiveExcluded(code);
  },
  eligibleDestinations: CH_OGB_PARTNER_STATES,
  excludedDestinations: new Set<string>(),
  conditions: [
    "Einmalig beim SECO eine ordentliche Generalausfuhrbewilligung (OGB) beantragen; die OGB ist nach Genehmigung zwei Jahre gültig (GKV Art. 12 + Art. 14).",
    "Die Melde- und Aufzeichnungspflichten der OGB einhalten (Ausfuhrmeldungen an das SECO, Aufbewahrung der Belege).",
    "Keine Nutzung, wenn der Exporteur weiss oder Grund zur Annahme hat, dass die Güter für ABC-Waffen oder eine verbotene Endverwendung bestimmt sind (GKV Art. 3 Abs. 4 Catch-all; das SECO kann die Bewilligung nach Art. 6 GKG verweigern/widerrufen).",
  ],
  citation: SRC_GKV_ART12,
  asOfDate: CH_OGB_AS_OF,
};

/** All curated CH general licences (space-relevant). Currently the OGB — see the
 * file header for why the AGB (Art. 13) and the Art. 12(2) Anhang-4 path are not
 * auto-granted here. */
export const CH_GENERAL_LICENCES: readonly GeneralLicence[] = [CH_OGB];

/**
 * Switzerland `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not CH-controlled → NONE/GO.
 *   2. CH-controlled + the OGB covers item×destination → GENERAL/GO under the
 *      OGB (authority SECO).
 *   3. CH-controlled + no OGB covers it → INDIVIDUAL/REVIEW = Einzelbewilligung
 *      at SECO.
 *
 * There is no member→NCA resolution (SECO is the single Swiss authority), so
 * `exporterSeat` is not consulted; authority is always "SECO".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Switzerland applies
 * the EU-aligned RU/BY sanctions; Gate 1.6 keeps CH→RU controlled dual-use
 * BLOCKED).
 */
export const chOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = chControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Swiss dual-use control → no CH licence requirement.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: CH_AUTHORITY,
      reasons: [
        "Gut trägt keinen schweizerischen Dual-Use-Kontrollcode (GKV Anhang 2 Teil 2, EKN) — keine schweizerische Ausfuhrbewilligung erforderlich.",
      ],
      citations: [SRC_GKV],
    };
  }

  // 2. CH-controlled + the OGB covers item×destination → GENERAL/GO.
  const covering = CH_GENERAL_LICENCES.find((lic) =>
    evaluateGeneralLicence(lic, classification, destinationCountry),
  );
  if (covering) {
    return {
      outcome: "GO",
      licenceType: "GENERAL",
      authority: CH_AUTHORITY,
      generalLicence: {
        id: covering.id,
        label: covering.label,
        conditions: covering.conditions,
      },
      reasons: [
        `Schweizerisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: die ordentliche Generalausfuhrbewilligung (OGB, GKV Art. 12) greift — ${dest} ist ein Anhang-7-Partnerstaat —, kein Einzelantrag nötig, sofern die OGB-Auflagen erfüllt sind (SECO-Beantragung, Meldepflichten).`,
      ],
      citations: [SRC_GKV, covering.citation],
    };
  }

  // 3. CH-controlled + no OGB covers it → INDIVIDUAL/REVIEW = Einzelbewilligung.
  //    Either the destination is NOT an Anhang-7 partner state (so the OGB does
  //    not apply and the AGB is exporter-specific — not auto-grantable), or the
  //    code is on the sensitive-exclusion floor (the most-sensitive MTCR/Annex-
  //    IV-equivalent codes — e.g. 9A004/9A106.c — which are not confirmable as
  //    OGB-eligible and fail-close, §4.5).
  const excluded = isSensitiveExcluded(code);
  const reasonDetail = excluded
    ? `Code ${code} ist ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut; eine OGB-Deckung ist aus dem GKV-Text nicht eindeutig bestätigbar (kein geschriebener Ausschluss-Katalog) — fail-closed (§4.5, kein false-CLEARED).`
    : `${dest} ist KEIN Anhang-7-Partnerstaat; die OGB greift nur für Partnerstaaten, und eine ausserordentliche Generalausfuhrbewilligung (AGB, GKV Art. 13) ist exporteur-spezifisch und hier nicht automatisch erteilbar.`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: CH_AUTHORITY,
    reasons: [
      `Schweizerisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Einzelausfuhrbewilligung beim SECO erforderlich.`,
    ],
    citations: excluded
      ? [SRC_GKV, SRC_GKV_ART12, SRC_SENSITIVE_FLOOR]
      : [SRC_GKV, SRC_GKV_ART12],
  };
};
