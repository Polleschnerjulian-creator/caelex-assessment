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
 * EU001 (Reg 2021/821 Annex II, Part EU001) — the friendly-destination GL:
 * export of dual-use items in any Annex I entry, EXCEPT those listed in the
 * Annex II "Section I" exclusion list, to AU/CA/IS/JP/NZ/NO/CH(+LI)/GB/US.
 * Conditions: registration with the NCA before first use + customs declaration
 * "EU001" + the WMD/missile/military-embargo end-use catch-all (Part 3).
 *
 * The Section I EXCLUSION list (carried forward from Reg 428/2009 Annex IIg)
 * keeps the most sensitive Annex I items OFF EU001 — notably the MTCR rocket-
 * subsystem family (9A004 launch-vehicle items, 9A005–9A011, 9A101–9A119,
 * 9D101–9D104, 9E101/9E102), Cat-0 nuclear (0C001/0C002/…), and CW precursors
 * (1C351/1C450/…). An EU-controlled item whose code is on Section I — or whose
 * Section-I status cannot be cleanly determined — is NOT EU001-eligible:
 * INDIVIDUAL/REVIEW at the NCA (fail-closed §4.5, NO guessed GO).
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
  "https://www.bafa.de/SharedDocs/Downloads/EN/Foreign_Trade/afk_eu_dual-use_reg_annex_ii.pdf — Annex II EUGEA (BAFA consolidated)";

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
 * EU001 Part-1 "Section I" EXCLUSION list — Annex I codes that EU001 does NOT
 * cover (Reg 2021/821 Annex II Section I, carried from Reg 428/2009 Annex IIg).
 *
 * Modelled as code PREFIXES (a declared code is excluded when it starts with
 * any prefix). This captures the published Section I clusters:
 *   • MTCR rocket-subsystem family: 9A004 (launch-vehicle items), 9A005–9A011,
 *     9A101–9A119, 9D101–9D104, 9E101/9E102.
 *   • Category 0 nuclear: 0C001, 0C002, 0D001, 0E001, …
 *   • CW precursors / sensitive Cat-1 chemicals: 1C351, 1C450, 1C012, 1C227–
 *     1C240, 1A102 (resaturated C-C for 9A004), 1A002.
 *   • Sensitive Cat-5 telecom/IS: 5A001.f, 5A001.j.
 *   • Rocket/missile technology: 7E104.
 *
 * FAIL-CLOSED NOTE: 9A004 is included here in full. The published Section I
 * scopes 9A004 to its launch-vehicle/MTCR sub-items, but the exact 9A004
 * sub-item boundary is NOT cleanly determinable from a machine-readable
 * official source at curation time — so a declared "9A004" is treated as
 * Section-I-excluded (no guessed GO; §4.5). If a future curation verifies the
 * precise 9A004 sub-scope, narrow this prefix.
 */
const EU001_SECTION_I_EXCLUDED_PREFIXES: readonly string[] = [
  // Category 0 — nuclear.
  "0C001",
  "0C002",
  "0D001",
  "0E001",
  // Category 1 — sensitive materials / CW precursors / MTCR C-C.
  "1A002",
  "1A102",
  "1C012",
  "1C227",
  "1C228",
  "1C229",
  "1C230",
  "1C231",
  "1C236",
  "1C237",
  "1C240",
  "1C350",
  "1C351",
  "1C352",
  "1C353",
  "1C354",
  "1C450",
  // Category 5 — sensitive IS / telecom sub-items.
  "5A001.f",
  "5A001.j",
  // Category 7 — rocket/missile technology.
  "7E104",
  // Category 9 — MTCR rocket-subsystem family (space launch vehicles, engines).
  "9A004",
  "9A005",
  "9A006",
  "9A007",
  "9A008",
  "9A009",
  "9A010",
  "9A011",
  "9A101",
  "9A102",
  "9A103",
  "9A104",
  "9A105",
  "9A106",
  "9A107",
  "9A108",
  "9A109",
  "9A110",
  "9A111",
  "9A115",
  "9A116",
  "9A117",
  "9A118",
  "9A119",
  "9D101",
  "9D102",
  "9D103",
  "9D104",
  "9E101",
  "9E102",
];

/** Normalise a declared code for prefix comparison (uppercase, trimmed). */
function normCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/** Is `code` on the EU001 Section I exclusion list (prefix match)? */
function isSectionIExcluded(code: string): boolean {
  const c = normCode(code);
  if (!c) return false;
  return EU001_SECTION_I_EXCLUDED_PREFIXES.some((p) => c.startsWith(p));
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
  //    on the EU001 Section I exclusion list (e.g. MTCR rocket subsystems).
  const sectionINote = isSectionIExcluded(code)
    ? `Code ${code} steht auf der EU001-Ausschlussliste (Annex II Section I — u. a. MTCR-Trägertechnik) und ist von EU001 nicht gedeckt.`
    : `Für ${destinationCountry} greift keine Union-Allgemeingenehmigung (EU001 deckt nur AU/CA/IS/JP/NZ/NO/CH/LI/GB/US).`;
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority,
    reasons: [
      `EU-kontrolliertes Dual-Use-Gut (${code}) nach ${destinationCountry}: ${sectionINote} Einzelausfuhrgenehmigung bei der zuständigen NCA erforderlich.`,
      ...seatNote,
    ],
    citations: [SRC_REG, SRC_ANNEX_II],
  };
};
