/**
 * Australia origin module (Spec 2026-06-13 §4.2, M-AU) — the individual-permit
 * licence determination for an exporter seated in Australia (AU).
 *
 * ─── What this module answers ─────────────────────────────────────────────
 * For an AU-seated exporter, Australian export-control law is administered by
 * Defence Export Controls (DEC) within the Department of Defence, under the
 * Customs (Prohibited Exports) Regulations 1958 and the Defence Trade Controls
 * Act 2012 (DTCA, as amended 2024). The control list is the Defence and
 * Strategic Goods List 2024 (DSGL, F2024L01024, in force 16 Aug 2024): Part 1 =
 * Munitions List (military), Part 2 = the DUAL-USE list — a verbatim transposition
 * of the Wassenaar dual-use list, so the DSGL Part-2 codes are BYTE-IDENTICAL to
 * EU Annex I (`9A004`, `5A002`, …; see `au-dsgl.ts`). The individual licence is
 * a DEC export permit. This module decides, for a given classified item ×
 * destination:
 *   • item not DSGL-controlled (no eccnEU, no controlled eccnUS) → NONE/GO.
 *   • controlled → INDIVIDUAL/REVIEW = a DEC export permit (see below: AU has NO
 *     item+destination-only general licence to auto-grant).
 *
 * ─── WHY AU HAS NO AUTO-GRANTABLE ITEM+DESTINATION GENERAL LICENCE ─────────
 * Australia's standing general authorisation candidate is the AUKUS "licence-free
 * environment" (Defence Trade Controls Amendment Act 2024, in force 1 Sep 2024).
 * It removes the permit requirement for many DSGL goods/technology transferred
 * to/within the three AUKUS partners (AU/US/UK). Among the golden-matrix
 * destinations only US is an AUKUS partner (UK is not a matrix destination; DE/
 * JP/IN/CN are not AUKUS). BUT the AUKUS environment is NOT an item+destination-
 * only general licence — it is gated on TWO facts this engine cannot establish
 * from item×destination alone:
 *   (1) the SUPPLIER and the RECIPIENT must be REGISTERED on the AUKUS Defence
 *       Export Control Client Register and be designated "authorised users" — a
 *       per-party registration/community-membership fact (not item×destination);
 *       and
 *   (2) the item must NOT be on the "Excluded DSGL goods and DSGL technology"
 *       List (Determination 2024, F2024L01100, in force 1 Sep 2024), which
 *       excludes the most-sensitive items, aligned with the NSG (nuclear), the
 *       Australia Group (CW/BW) and the other multilateral regimes (MTCR/
 *       Wassenaar) of which all three countries are members.
 *
 * Because the AUKUS exemption is registration/authorised-user-gated (directly
 * analogous to the EU's exporter-specific EU002-008 and Switzerland's AGB, which
 * the sibling modules also DO NOT auto-grant), it cannot be auto-granted from
 * item×destination — its coverage falls through to the INDIVIDUAL/REVIEW default
 * (the operator can still claim it manually if they are a registered authorised
 * user and the item is off the Excluded List). The PARAMOUNT SAFETY PRINCIPLE
 * (§4.5 / no false-CLEARED) forbids an auto-GO that depends on a registration
 * status we have not verified. So for an AU-origin controlled export — EVEN
 * AU→US — the honest, cited answer is INDIVIDUAL/REVIEW at DEC. M-AU is therefore
 * a "mostly individual-licence" origin: that is CORRECT and valuable (a cited,
 * origin-specific REVIEW naming DEC + the AUKUS register).
 *
 * `AU_GENERAL_LICENCES` is consequently EMPTY — there is no self-executing
 * item+destination general licence to model. (The EU/UK/CH modules carry one
 * because their general licences ARE item+destination-determinable; the AUKUS
 * environment is not.)
 *
 * ─── THE SENSITIVE-EXCLUSION FLOOR (no false-CLEARED, §4.5) ────────────────
 * Even though the verdict is REVIEW for ALL controlled items (so the floor does
 * not change the outcome), the module still classifies the most-sensitive MTCR/
 * Annex-IV-equivalent codes (9A004 space launch vehicles, 9A106.c thrust-vector
 * control, …) so its REASON is precise: those codes are BOTH the most-sensitive
 * dual-use goods AND on the F2024L01100 Excluded List, so they could never use
 * the AUKUS exemption even by a registered user. Australia transposes the
 * IDENTICAL international control lists the EU/UK do, so the floor reuses the
 * EXACT EU/UK-verified exclusion set (EU 2021/821 Annex II Section I = retained
 * Reg 428/2009 Annex IIg, byte-identical): "all items in Annex IV" + the 13
 * explicit codes, plus the fail-closed bare-PARENT guard. Golden sat-bus (9A004)
 * and apogee-engine (9A106) correctly STAY REVIEW for every destination.
 *
 * ─── Engine interaction (§4.3) ─────────────────────────────────────────────
 * For an AU seat, `dualUsePrimary = AU_DSGL`, `militaryPrimary = null`. Until
 * M-AU the engine's Gate 4.5 (thin-origin REVIEW) was the ONLY guard for an
 * AU-seat controlled export (REGIME_MATURITY AU_DSGL = 3). M-AU lifts it to 2
 * and registers this module; Gate 4.5 stops firing for AU. Because this module
 * never emits a GENERAL verdict, the wiring never removes the generic Gate-3.5/
 * Gate-4 REVIEW rows (the supersede is GENERAL-only) — the module's INDIVIDUAL
 * verdict simply confirms and labels the DEC-permit REVIEW with a cited reason,
 * replacing the generic Gate-4.5 thin-origin REVIEW for AU. Hard destination
 * prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM and are NEVER
 * reached here as anything but a skipped module — the wiring skips this module
 * when a hard prohibition already blocks (Australia applies the RU sanctions;
 * Gate 1.6 keeps an AU→RU controlled dual-use export BLOCKED). An item bearing a
 * US ECCN (eccnUS) also carries an independent US/BIS leg the module does NOT
 * override.
 *
 * Pure — no I/O, no Prisma, no AI-call.
 *
 * @see https://www.legislation.gov.au/F2024L01024/latest/text — Defence and Strategic Goods List 2024 (DSGL, in force 16 Aug 2024); Part 2 = the dual-use list (Wassenaar mirror, byte-identical to EU Annex I)
 * @see https://www.defence.gov.au/business-industry/exporting/applications-pre-notifications/licence-free-environment — DEC: AUKUS licence-free environment (requires registration on the AUKUS Defence Export Control Client Register + authorised-user status + item off the Excluded List)
 * @see https://www.legislation.gov.au/F2024L01100/asmade — Defence Trade Controls (Excluded DSGL goods and DSGL technology) Determination 2024 (F2024L01100, in force 1 Sep 2024) — the most-sensitive items excluded from the AUKUS exemption (NSG/AG + multilateral-regime items)
 * @see https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Australia mirrors via Wassenaar/MTCR/NSG/AG); used as the sensitive-item floor for the REVIEW reasoning
 */

import type {
  ClassificationLike,
  GeneralLicence,
  OriginDeterminationInput,
  OriginLicenceVerdict,
} from "./types";

/**
 * The issuing/competent authority for Australian strategic export controls.
 * Defence Export Controls (DEC), Australian Department of Defence.
 */
const AU_AUTHORITY = "Defence Export Controls (DEC)";

/** Official source URLs (carried into every verdict's `citations`). */
const SRC_DSGL =
  "https://www.legislation.gov.au/F2024L01024/latest/text — Defence and Strategic Goods List 2024 (DSGL, in force 16 Aug 2024); Part 2 = dual-use list (Wassenaar mirror, byte-identical to EU Annex I)";
const SRC_AUKUS_LFE =
  "https://www.defence.gov.au/business-industry/exporting/applications-pre-notifications/licence-free-environment — DEC AUKUS licence-free environment: requires registration on the AUKUS Defence Export Control Client Register + authorised-user status + the item being off the Excluded List (not an item+destination-only general licence)";
const SRC_EXCLUDED_LIST =
  "https://www.legislation.gov.au/F2024L01100/asmade — Defence Trade Controls (Excluded DSGL goods and DSGL technology) Determination 2024 (F2024L01100, in force 1 Sep 2024) — excludes the most-sensitive items (NSG/AG + the other multilateral-regime items) from the AUKUS exemption";
/**
 * The MTCR/Annex-IV-equivalent sensitive floor — verified against the EU/UK
 * Annex IV (byte-identical; Australia transposes the same lists). Used to make
 * the REVIEW reason precise for the most-sensitive codes, NOT to grant any GO.
 */
const SRC_SENSITIVE_FLOOR =
  "https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Annex IV (the most-sensitive MTCR/Annex-IV list Australia mirrors via Wassenaar/MTCR/NSG/AG); used as the sensitive-item floor for the DEC-permit REVIEW reasoning";

/** Determination freshness as-of (verification date against the DSGL 2024 + F2024L01100). */
export const AU_DETERMINATION_AS_OF = "2026-06-13";

/**
 * Sensitive-exclusion floor — PART (2): the 13 EXPLICIT codes.
 *
 * Byte-identical to the EU 2021/821 Annex II Section I explicit list (= retained
 * Reg 428/2009 Annex IIg). Australia transposes the identical Wassenaar/MTCR/
 * NSG/AG lists, so the SAME most-sensitive codes the EU/UK exclude from their
 * self-executing general licences are the ones the AUKUS exemption excludes via
 * the F2024L01100 Excluded List. Stored normalised (UPPERCASE) for comparison.
 * The matcher (`matchesCode`) is sub-precise: `9A009.A` matches only the .a
 * branch (NOT .b); `1C450.A.1`/`1C450.A.2` only those two salts (NOT bare 1C450).
 */
const AU_SENSITIVE_EXPLICIT_CODES: readonly string[] = [
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
 * The most-sensitive MTCR/Annex-IV list. Australia mirrors it via the same
 * multilateral regimes (Wassenaar/MTCR/NSG/AG), so the member codes below mirror
 * the EU/UK `ANNEX_IV_EXCLUDED_PREFIXES` exactly. Where Annex IV lists a SUB-item
 * of a parent, BOTH the precise sub-code AND its bare parent stem are listed: a
 * declared bare parent (e.g. "9A106") cannot be cleanly confirmed to sit OUTSIDE
 * the sensitive sub-item, so it fail-closes (§4.5). This is why golden 9A004
 * (sat-bus) and 9A106 (apogee-engine) correctly STAY REVIEW for an AU seat (they
 * are REVIEW in any case — AU has no general licence — but the floor labels them
 * as the most-sensitive items so the reason is precise).
 *
 * For Category 0 the whole category is treated excluded by the `0` stem (a Cat-0
 * nuclear item is never AUKUS-exemptible — explicitly NSG-listed on F2024L01100).
 */
const AU_ANNEX_IV_EQUIV_PREFIXES: readonly string[] = [
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
 * the NON-sensitive sibling — the bare code SPANS both the sensitive and the
 * non-sensitive sub-items, so labelling it non-sensitive would be a guess.
 *
 * This is load-bearing for the precise REASON: the AU DSGL Part 2 (= EU Annex I,
 * mirrored in `au-dsgl.ts`) classifies hybrid rocket motors as the BARE `9A009`
 * (no .a/.b split). The bare parent is treated sensitive (§4.5). A TRUE sibling
 * sub-code (`9A009.B`, `1C450.B`) is NOT a parent of any excluded code, so it is
 * unaffected. Expects a normalised input.
 */
function isParentOfExcludedSubCode(c: string): boolean {
  if (!c) return false;
  const stem = `${c}.`;
  return (
    AU_SENSITIVE_EXPLICIT_CODES.some((p) => p.startsWith(stem)) ||
    AU_ANNEX_IV_EQUIV_PREFIXES.some((p) => p.startsWith(stem))
  );
}

/**
 * Is `code` on the sensitive-exclusion floor (the most-sensitive MTCR/Annex-IV-
 * equivalent codes, also on the F2024L01100 AUKUS Excluded List)?
 *   PART (1) the Annex-IV-equivalent set — `AU_ANNEX_IV_EQUIV_PREFIXES`
 *   PART (2) the 13 explicit codes       — `AU_SENSITIVE_EXPLICIT_CODES`
 * plus the fail-closed bare-PARENT guard (a bare parent of any excluded sub-code,
 * e.g. the AU corpus's bare `9A009` over `9A009.a`).
 *
 * This only refines the REVIEW REASON (sensitive vs ordinary controlled) — it
 * does not change the outcome, since EVERY controlled AU export is REVIEW (AU has
 * no item+destination general licence to grant).
 */
function isSensitiveExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return (
    AU_SENSITIVE_EXPLICIT_CODES.some((p) => matchesCode(c, p)) ||
    AU_ANNEX_IV_EQUIV_PREFIXES.some((p) => matchesCode(c, p)) ||
    isParentOfExcludedSubCode(c)
  );
}

/**
 * The AU-controlled dual-use code carried by a classification, if any.
 * AU control attaches via a declared `eccnEU` (the DSGL Part 2 is byte-identical
 * to EU Annex I) OR a declared non-EAR99 `eccnUS` (which, in this corpus, is the
 * Wassenaar/CCL mirror of the same dual-use item Australia transposes). Returns
 * the operative code (eccnEU preferred), else null. USML/ITAR (`usmlCategory`)
 * is a US control handled by the upstream ITAR gate and is never AU-permitted
 * here.
 */
function auControlledCode(c: ClassificationLike): string | null {
  const eu = normCode(c.eccnEU);
  if (eu) return eu;
  const us = normCode(c.eccnUS);
  if (us && us !== "EAR99") return us;
  return null;
}

/**
 * All curated AU general licences (space-relevant) — EMPTY.
 *
 * Australia has NO item+destination-only general licence to auto-grant: the
 * AUKUS licence-free environment (the only standing general authorisation) is
 * gated on registration/authorised-user status + the F2024L01100 Excluded List
 * (see the file header), neither of which is derivable from item×destination, so
 * it is treated like the EU's exporter-specific EU002-008 / Switzerland's AGB —
 * not auto-grantable. Every controlled AU export is therefore INDIVIDUAL/REVIEW
 * at DEC. Kept as an explicit empty array (parallel to the sibling modules' GL
 * lists) so the "no general licence" position is data, not an omission.
 */
export const AU_GENERAL_LICENCES: readonly GeneralLicence[] = [];

/**
 * Australia `OriginLicenceModule`. Decision flow (§4.2):
 *   1. item not DSGL-controlled → NONE/GO.
 *   2. DSGL-controlled → INDIVIDUAL/REVIEW = a DEC export permit (AU has no
 *      item+destination general licence; the AUKUS environment is registration-
 *      gated and not auto-grantable). The reason distinguishes the most-sensitive
 *      MTCR/Annex-IV-equivalent codes (also on the F2024L01100 Excluded List)
 *      from ordinary controlled dual-use goods.
 *
 * There is no member→NCA resolution (DEC is the single Australian authority), so
 * `exporterSeat` is not consulted; authority is always "Defence Export Controls
 * (DEC)".
 *
 * Hard destination prohibitions (embargo / RU-BY / ITAR) are decided UPSTREAM by
 * the engine gates and are never reached here as GO — the wiring skips this
 * module entirely when a hard prohibition already blocks (Australia applies the
 * RU sanctions; Gate 1.6 keeps AU→RU controlled dual-use BLOCKED).
 */
export const auOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const { classification, destinationCountry } = input;
  const code = auControlledCode(classification);
  const dest = (destinationCountry ?? "").trim().toUpperCase();

  // 1. Uncontrolled under Australian dual-use control → no AU permit required.
  if (!code) {
    return {
      outcome: "GO",
      licenceType: "NONE",
      authority: AU_AUTHORITY,
      reasons: [
        "Gut trägt keinen australischen Kontrollcode (DSGL Part 2 — Dual-Use-Liste) — keine australische Ausfuhrgenehmigung erforderlich.",
      ],
      citations: [SRC_DSGL],
    };
  }

  // 2. AU-controlled → INDIVIDUAL/REVIEW (a DEC export permit). There is no
  //    item+destination-only general licence: the AUKUS licence-free environment
  //    is registration/authorised-user-gated (+ the F2024L01100 Excluded List)
  //    and cannot be auto-granted (§4.5, no false-CLEARED). The reason
  //    distinguishes the most-sensitive codes from ordinary controlled goods.
  const sensitive = isSensitiveExcluded(code);
  const aukusPartner = dest === "US" || dest === "GB";
  const reasonDetail = sensitive
    ? `Code ${code} ist ein besonders sensibles MTCR/Anhang-IV-äquivalentes Gut und steht auf der "Excluded DSGL goods and DSGL technology" List (F2024L01100) — von der AUKUS-Lizenzfreiheit ausgenommen; ein DEC-Einzelantrag ist in jedem Fall erforderlich (fail-closed §4.5, kein false-CLEARED).`
    : aukusPartner
      ? `Die AUKUS-Lizenzfreiheit (Defence Trade Controls Amendment Act 2024) könnte einen Transfer an einen AUKUS-Partner (${dest}) genehmigungsfrei stellen, ist aber KEINE item+ziel-basierte Generalbewilligung: sie setzt die Registrierung von Exporteur UND Empfänger im AUKUS Defence Export Control Client Register ("authorised users") sowie ein nicht auf der Excluded List stehendes Gut voraus — beides ist aus Item×Ziel nicht feststellbar und daher nicht automatisch erteilbar. Der Exporteur kann sie bei Vorliegen des Registrierungsstatus selbst geltend machen.`
      : `Für ${dest} greift keine australische Generalbewilligung (die AUKUS-Lizenzfreiheit gilt nur für die AUKUS-Partner US/UK und ist registrierungsgebunden).`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: AU_AUTHORITY,
    reasons: [
      `Australisch kontrolliertes Dual-Use-Gut (${code}) nach ${dest}: ${reasonDetail} Einzel-Ausfuhrgenehmigung bei Defence Export Controls (DEC) erforderlich.`,
    ],
    citations: sensitive
      ? [SRC_DSGL, SRC_AUKUS_LFE, SRC_EXCLUDED_LIST, SRC_SENSITIVE_FLOOR]
      : [SRC_DSGL, SRC_AUKUS_LFE, SRC_EXCLUDED_LIST],
  };
};
