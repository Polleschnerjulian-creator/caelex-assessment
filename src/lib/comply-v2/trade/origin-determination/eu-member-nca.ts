/**
 * EU member-state → National Competent Authority (NCA) for dual-use export
 * licensing (Spec 2026-06-13 §4.2, M-EU parameters).
 *
 * Reg (EU) 2021/821 is union-wide uniform on the SUBSTANCE (Annex I control
 * list + Annex II EUGEA), but the issuing/competent authority differs per
 * member state: an export licence (individual licence, or registration to use
 * an EUGEA) is filed with the NCA of the member state where the exporter is
 * resident/established (Art. 12(1), Art. 2(7)). The M-EU module resolves the
 * authority from `exporterSeat` via this table.
 *
 * Each name is the member state's officially-designated dual-use NCA. Where a
 * state designates more than one body (e.g. NL splits policy and customs
 * licensing), the operative export-licensing authority is named with the
 * commonly-used acronym. Citations: the EU Commission keeps the consolidated
 * list of competent authorities ("Information about the national authorities
 * responsible for processing applications", OJ C series, updated periodically),
 * and each member state publishes its own designation. The per-state acronyms
 * below are the official authority designations as published.
 *
 * FAIL-CLOSED (§4.5 / M-EU): when `exporterSeat` is undefined/unknown OR not an
 * EU-27 member, `resolveEuMemberNca()` returns the generic EU label and the
 * caller must NOT assume a specific member — see `eu.ts`.
 *
 * Pure data — no I/O.
 *
 * @see https://eur-lex.europa.eu/eli/reg/2021/821/oj — Reg (EU) 2021/821 Art. 12
 * @see https://policy.trade.ec.europa.eu/help-exporters-and-importers/exporting-dual-use-items_en
 */

/** As-of date of the authority designations curated here. */
export const EU_MEMBER_NCA_AS_OF = "2026-06-13";

/**
 * EU-27 member state (ISO 3166-1 alpha-2) → dual-use export NCA designation.
 *
 * Keyed by uppercase ISO-2. Covers all 27 current members (matches
 * `EU27_MEMBER_STATES`). Each value is the official authority name/acronym.
 */
export const EU_MEMBER_NCA: Readonly<Record<string, string>> = {
  // Germany — Bundesamt für Wirtschaft und Ausfuhrkontrolle.
  DE: "BAFA (Bundesamt für Wirtschaft und Ausfuhrkontrolle)",
  // France — Service des biens à double usage (DGE/SBDU), Ministère de l'Économie.
  FR: "SBDU (Service des biens à double usage, DGE)",
  // Italy — Unità per le autorizzazioni dei materiali di armamento, MAECI.
  IT: "UAMA (Unità per le Autorizzazioni dei Materiali di Armamento)",
  // Netherlands — Centrale Dienst voor In- en Uitvoer (Customs / Belastingdienst Douane).
  NL: "CDIU (Centrale Dienst voor In- en Uitvoer, Douane)",
  // Spain — Subdirección General de Comercio Internacional de Material de Defensa y Doble Uso.
  ES: "SGCID (SG de Comercio Internacional de Material de Defensa y Doble Uso)",
  // Belgium — regional (Flanders/Wallonia/Brussels); federal contact for dual-use coordination.
  BE: "Regional licensing authority (Vlaanderen / Wallonie / Bruxelles) — dual-use",
  // Austria — Bundesministerium für Arbeit und Wirtschaft (BMAW), Außenwirtschaftskontrolle.
  AT: "BMAW (Bundesministerium für Arbeit und Wirtschaft) — Außenwirtschaftskontrolle",
  // Sweden — Inspektionen för strategiska produkter.
  SE: "ISP (Inspektionen för strategiska produkter)",
  // Finland — Ulkoministeriö (Ministry for Foreign Affairs), export control unit.
  FI: "Ulkoministeriö (Ministry for Foreign Affairs) — vientivalvonta",
  // Denmark — Erhvervsstyrelsen (Danish Business Authority).
  DK: "Erhvervsstyrelsen (Danish Business Authority)",
  // Ireland — Department of Enterprise, Trade and Employment (export licensing).
  IE: "DETE (Department of Enterprise, Trade and Employment) — Export Licensing",
  // Poland — Ministerstwo Rozwoju i Technologii (Department of Trade and International Cooperation).
  PL: "Ministerstwo Rozwoju i Technologii — kontrola obrotu",
  // Portugal — Direção-Geral das Atividades Económicas (DGAE).
  PT: "DGAE (Direção-Geral das Atividades Económicas)",
  // Czechia — Ministerstvo průmyslu a obchodu, Licenční správa.
  CZ: "MPO — Licenční správa (Ministry of Industry and Trade)",
  // Slovakia — Ministerstvo hospodárstva SR (Ministry of Economy).
  SK: "Ministerstvo hospodárstva SR (Ministry of Economy)",
  // Hungary — Budapest Főváros Kormányhivatala (export control authority).
  HU: "BFKH (Budapest Főváros Kormányhivatala) — export control",
  // Romania — ANCEX (Agenția Națională de Control al Exporturilor), MAE.
  RO: "ANCEX (Agenția Națională de Control al Exporturilor)",
  // Bulgaria — Interministerial Commission for Export Control (Ministry of Economy).
  BG: "Interministerial Commission for Export Control (Ministry of Economy)",
  // Greece — Ministry of Development (export control directorate).
  GR: "Ministry of Development — export control directorate",
  // Croatia — Ministarstvo vanjskih i europskih poslova (export control).
  HR: "Ministarstvo vanjskih i europskih poslova — kontrola izvoza",
  // Slovenia — Ministrstvo za gospodarstvo, turizem in šport.
  SI: "Ministrstvo za gospodarstvo, turizem in šport — izvozni nadzor",
  // Lithuania — Ministry of Economy and Innovation (strategic goods control).
  LT: "Ministry of Economy and Innovation — strategic goods control",
  // Latvia — Stratēģiskas nozīmes preču kontroles komiteja (MFA).
  LV: "Stratēģiskas nozīmes preču kontroles komiteja (MFA)",
  // Estonia — Strateegilise kauba komisjon (MFA).
  EE: "Strateegilise kauba komisjon (MFA)",
  // Luxembourg — Office du contrôle des exportations (OCEIT), Ministère de l'Économie.
  LU: "OCEIT (Office du contrôle des exportations, importations et du transit)",
  // Cyprus — Ministry of Energy, Commerce and Industry (import/export licensing).
  CY: "Ministry of Energy, Commerce and Industry — Trade Service",
  // Malta — Commerce Department, Trade Services Directorate.
  MT: "Commerce Department — Trade Services Directorate (Malta)",
};

/** The generic fallback when the seat is unknown or not an EU-27 member. */
export const EU_GENERIC_NCA =
  "EU national competent authority (member state of the exporter's seat)";

/**
 * Resolve the dual-use NCA for an exporter seat.
 *
 * FAIL-CLOSED (§4.5): an undefined/empty seat, or a non-EU-27 ISO-2, returns
 * the generic EU label — the module must then flag "seat unknown" and never
 * assume a particular member state.
 *
 * @param seatIso2  Exporter seat ISO 3166-1 alpha-2 (any case), or undefined.
 * @returns the member NCA name, or the generic EU label when unresolvable.
 */
export function resolveEuMemberNca(seatIso2: string | undefined): {
  authority: string;
  seatKnown: boolean;
} {
  const iso = (seatIso2 ?? "").trim().toUpperCase();
  if (iso && iso in EU_MEMBER_NCA) {
    return { authority: EU_MEMBER_NCA[iso], seatKnown: true };
  }
  return { authority: EU_GENERIC_NCA, seatKnown: false };
}
