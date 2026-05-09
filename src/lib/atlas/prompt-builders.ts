/**
 * Atlas Drafting — Pure prompt-builders (Bundle 43).
 *
 * The studio page (bundles 30-42) defined builders inline as closures
 * over React state. With Bundle 43 introducing a second consumer (the
 * plan workspace), the builders need to live somewhere shared so both
 * surfaces dispatch identical prompts.
 *
 * These are pure functions — no React, no localStorage. They take the
 * builder args explicitly and return the assembled prompt string. The
 * studio passes its current React state; the plan workspace passes the
 * plan-item defaults merged with any per-item overrides.
 *
 * Privilege-prefix and clause-directive remain studio-side concerns
 * (they're session-wide, not per-builder), but mandate context and
 * authority directive are baked in here so any consumer gets them
 * consistently.
 */

import { buildAuthorityDirective } from "./authority-templates";

/* Mirror of OPERATOR_TYPES in the studio. Kept in sync — whenever a
   new operator type lands in the studio's tuple, add it here. */
export type OperatorType =
  | "satellite_operator"
  | "launch_provider"
  | "ground_segment"
  | "data_provider"
  | "in_orbit_services"
  | "constellation_operator"
  | "space_resource_operator";

export const OPERATOR_LABELS: Record<OperatorType, { en: string; de: string }> =
  {
    satellite_operator: { en: "Satellite operator", de: "Satellitenbetreiber" },
    launch_provider: { en: "Launch provider", de: "Startanbieter" },
    ground_segment: {
      en: "Ground-segment operator",
      de: "Bodensegment-Betreiber",
    },
    data_provider: { en: "Data provider", de: "Datenanbieter" },
    in_orbit_services: {
      en: "In-orbit services",
      de: "Im-Orbit-Dienstleistungen",
    },
    constellation_operator: {
      en: "Constellation operator",
      de: "Konstellations-Betreiber",
    },
    space_resource_operator: {
      en: "Space-resource operator",
      de: "Weltraum-Ressourcen-Betreiber",
    },
  };

/* ── Auth ─────────────────────────────────────────────────────────── */

export function buildAuthPrompt(args: {
  jurisdiction: string;
  operatorType: OperatorType | string;
  mission: string;
  authorityId?: string;
  outputLang: "de" | "en";
}): string {
  const outputDe = args.outputLang === "de";
  const opLabel =
    (OPERATOR_LABELS as Record<string, { de: string; en: string }>)[
      args.operatorType
    ]?.[outputDe ? "de" : "en"] ?? args.operatorType;
  const baseEn = `Draft an authorization application scaffold for a ${opLabel.toLowerCase()} filing in ${args.jurisdiction}.`;
  const baseDe = `Erstelle ein Genehmigungsantrag-Gerüst für einen ${opLabel} in ${args.jurisdiction}.`;
  const missionPart = args.mission.trim()
    ? outputDe
      ? ` Missionsprofil: ${args.mission.trim()}.`
      : ` Mission profile: ${args.mission.trim()}.`
    : "";
  const authorityDirective = buildAuthorityDirective(
    args.authorityId,
    outputDe ? "de" : "en",
  );
  return (outputDe ? baseDe : baseEn) + missionPart + authorityDirective;
}

/* ── Brief ────────────────────────────────────────────────────────── */

export function buildBriefPrompt(args: {
  topic: string;
  mandateContext?: string;
  outputLang: "de" | "en";
}): string {
  const outputDe = args.outputLang === "de";
  const base = outputDe
    ? `Erstelle ein Compliance-Briefing zum Thema: ${args.topic.trim()}.`
    : `Draft a compliance brief on: ${args.topic.trim()}.`;
  const ctx = args.mandateContext?.trim()
    ? outputDe
      ? ` Mandanten-Kontext: ${args.mandateContext.trim()}.`
      : ` Mandate context: ${args.mandateContext.trim()}.`
    : "";
  return base + ctx;
}

/* ── Compare ──────────────────────────────────────────────────────── */

export function buildComparePrompt(args: {
  jurisdictions: string[];
  mandateContext?: string;
  outputLang: "de" | "en";
}): string {
  const outputDe = args.outputLang === "de";
  const list = args.jurisdictions.join(", ");
  const base = outputDe
    ? `Vergleiche die folgenden Jurisdiktionen für ein Filing: ${list}. Erstelle eine Kriterien-Matrix mit zitierten ATLAS-IDs.`
    : `Compare the following jurisdictions for a filing: ${list}. Produce a criteria matrix with cited ATLAS-IDs.`;
  const ctx = args.mandateContext?.trim()
    ? outputDe
      ? ` Mandanten-Kontext: ${args.mandateContext.trim()}.`
      : ` Mandate context: ${args.mandateContext.trim()}.`
    : "";
  return base + ctx;
}

/* ── NDA ──────────────────────────────────────────────────────────── */

export function buildNdaPrompt(args: {
  ndaType: "mutual" | "one_way";
  partyA: string;
  partyB: string;
  jurisdiction: string;
  termYears: string;
  mandateContext?: string;
  outputLang: "de" | "en";
}): string {
  const outputDe = args.outputLang === "de";
  const aRaw = args.partyA.trim();
  const bRaw = args.partyB.trim();
  const a = aRaw || (outputDe ? "[Partei A]" : "[Party A]");
  const b = bRaw || (outputDe ? "[Partei B]" : "[Party B]");
  const term = args.termYears.trim() || "3";
  const baseDe =
    args.ndaType === "mutual"
      ? `Erstelle einen wechselseitigen NDA (Mutual Non-Disclosure Agreement) zwischen ${a} und ${b}. Geltendes Recht: ${args.jurisdiction}. Laufzeit: ${term} Jahre.`
      : `Erstelle einen einseitigen NDA (One-Way Non-Disclosure Agreement) — ${a} als Disclosing Party, ${b} als Receiving Party. Geltendes Recht: ${args.jurisdiction}. Laufzeit: ${term} Jahre.`;
  const baseEn =
    args.ndaType === "mutual"
      ? `Draft a mutual non-disclosure agreement between ${a} and ${b}. Governing law: ${args.jurisdiction}. Term: ${term} years.`
      : `Draft a one-way non-disclosure agreement — ${a} as disclosing party, ${b} as receiving party. Governing law: ${args.jurisdiction}. Term: ${term} years.`;
  const ctx = args.mandateContext?.trim()
    ? outputDe
      ? ` Mandanten-Kontext: ${args.mandateContext.trim()}.`
      : ` Mandate context: ${args.mandateContext.trim()}.`
    : "";
  return (outputDe ? baseDe : baseEn) + ctx;
}

/* ── Cover letter ─────────────────────────────────────────────────── */

export function buildCoverPrompt(args: {
  filingType: "authorization" | "notification" | "renewal" | "amendment";
  authority: string;
  reference: string;
  authorityId?: string;
  mandateContext?: string;
  outputLang: "de" | "en";
}): string {
  const outputDe = args.outputLang === "de";
  const filingTypeLabelsDe: Record<typeof args.filingType, string> = {
    authorization: "Erstantrag (Genehmigung)",
    notification: "Notifikation",
    renewal: "Verlängerung",
    amendment: "Änderung",
  };
  const filingTypeLabelsEn: Record<typeof args.filingType, string> = {
    authorization: "initial authorization application",
    notification: "notification",
    renewal: "renewal",
    amendment: "amendment",
  };
  const fLabel = outputDe
    ? filingTypeLabelsDe[args.filingType]
    : filingTypeLabelsEn[args.filingType];
  const auth =
    args.authority.trim() || (outputDe ? "[Behörde]" : "[Authority]");
  const ref = args.reference.trim()
    ? outputDe
      ? ` Aktenzeichen: ${args.reference.trim()}.`
      : ` Reference: ${args.reference.trim()}.`
    : "";
  const baseEn = `Draft a cover letter for a ${fLabel} filing addressed to ${auth}.${ref} Include standard salutation, identifying section, list of enclosed documents placeholder, and closing block.`;
  const baseDe = `Erstelle ein Anschreiben für eine ${fLabel} an ${auth}.${ref} Inklusive Standard-Anrede, Identifikations-Block, Anlagen-Verzeichnis-Platzhalter und Abschlussblock.`;
  const ctx = args.mandateContext?.trim()
    ? outputDe
      ? ` Mandanten-Kontext: ${args.mandateContext.trim()}.`
      : ` Mandate context: ${args.mandateContext.trim()}.`
    : "";
  const authorityDirective = buildAuthorityDirective(
    args.authorityId,
    outputDe ? "de" : "en",
  );
  return (outputDe ? baseDe : baseEn) + ctx + authorityDirective;
}
