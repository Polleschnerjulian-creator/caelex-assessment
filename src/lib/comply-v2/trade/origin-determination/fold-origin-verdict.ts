/**
 * Engine-Origin-Determination — Verdict→requirements folder (Spec §4.3).
 *
 * Pure mapper from a module's `OriginLicenceVerdict` to the engine's
 * `LicenseRequirement[]` deltas, using the REAL `RequirementStatus`/
 * `LicenseType` enums from `license-determination.ts`. The engine appends
 * these deltas to its `requirements` array, after which its existing gate
 * aggregation (PROHIBITED/DENIED→BLOCKED, REQUIRED→REVIEW_NEEDED, …) produces
 * the overall gate — so the fold need only pick the right per-status shape.
 *
 * Outcome→status mapping (§4.3):
 *   NONE       → [] (uncontrolled — no licence requirement at all).
 *   GENERAL    → EXCEPTION_MAY_APPLY + GENERAL_LICENSE — the GO path. This is
 *                the de-minimis-eligible / exception status the gate treats as
 *                neither `hasRequired` nor `hasLikely`, so a covering general
 *                licence yields a CLEARED/GO gate (unless another requirement
 *                forces review). The licence id + conditions ride on
 *                `applicableException` + the action text.
 *   INDIVIDUAL → REQUIRED — the REVIEW_NEEDED path; names the NCA in text.
 *   PROHIBITED → PROHIBITED — the BLOCKED path (non-derogable, like Gate 0).
 *
 * AUTHORITY NOTE: the engine's `LicenseRequirement.authority` is a fixed union
 * (BIS/DDTC/BAFA/EU_COMPETENT_AUTHORITY/MTCR_REVIEW) that does NOT carry the
 * national NCAs (ECJU/SECO/MOTIE/…). Mirroring Gate 4.5, the NCA name lives in
 * the human-readable `jurisdiction`/`reason`/`recommendedAction` text, while
 * the enum field uses the generic `EU_COMPETENT_AUTHORITY` — no parallel enum
 * is invented and the existing exception-matching (`findExceptionForAuthority`)
 * is unaffected (a GENERAL_LICENSE row is never REQUIRED, so it is never
 * re-downgraded).
 *
 * FAIL-CLOSED (§4.5): a GENERAL/GO row is only ever produced by a module that
 * supplied a `generalLicence` (with a citation) — this mapper trusts the
 * module's outcome; the module is the layer that guarantees no false-CLEARED.
 *
 * Pure — no I/O.
 */

import type { LicenseRequirement } from "../license-determination";
import type { OriginLicenceVerdict } from "./types";

/** Joins the module citations into a compact, source-traceable suffix. */
function citationSuffix(citations: string[]): string {
  return citations.length > 0 ? ` (Quelle: ${citations.join("; ")})` : "";
}

/** Joins the module reasons into a compact reason string. */
function reasonText(verdict: OriginLicenceVerdict): string {
  const base = verdict.reasons.join(" ");
  return `${base}${citationSuffix(verdict.citations)}`;
}

export function foldOriginVerdict(
  verdict: OriginLicenceVerdict,
): LicenseRequirement[] {
  switch (verdict.licenceType) {
    case "NONE":
      // Uncontrolled under this origin's regime — emit nothing.
      return [];

    case "GENERAL": {
      const gl = verdict.generalLicence;
      const conditions = gl?.conditions ?? [];
      return [
        {
          jurisdiction: `Exporteur-Sitz (${verdict.authority})`,
          authority: "EU_COMPETENT_AUTHORITY",
          status: "EXCEPTION_MAY_APPLY",
          licenseType: "GENERAL_LICENSE",
          reason: `Ausfuhr unter General-/Sammelgenehmigung ${gl?.label ?? gl?.id ?? "(allgemein)"} zulässig (Behörde ${verdict.authority}). ${reasonText(verdict)}`,
          recommendedAction:
            conditions.length > 0
              ? `Auflagen der General-Genehmigung erfüllen: ${conditions.join("; ")}.`
              : `Eignung der General-Genehmigung gegen die Item×Ziel-Bedingungen prüfen und dokumentieren.`,
          triggerCode: "ORIGIN_GENERAL_LICENCE",
          ...(gl
            ? {
                applicableException: {
                  code: gl.id,
                  label: gl.label,
                  citation: verdict.citations[0] ?? "",
                  conditions: gl.conditions,
                },
              }
            : {}),
        },
      ];
    }

    case "INDIVIDUAL":
      return [
        {
          jurisdiction: `Exporteur-Sitz (${verdict.authority})`,
          authority: "EU_COMPETENT_AUTHORITY",
          status: "REQUIRED",
          licenseType: "SPECIFIC_LICENSE",
          reason: `Einzelausfuhrgenehmigung bei ${verdict.authority} erforderlich — keine greifende General-Genehmigung für diese Item×Ziel-Kombination. ${reasonText(verdict)}`,
          recommendedAction: `Einzelantrag bei der zuständigen Behörde (${verdict.authority}) stellen, bevor die Sendung erfolgt.`,
          triggerCode: "ORIGIN_INDIVIDUAL_LICENCE",
        },
      ];

    case "PROHIBITED":
      return [
        {
          jurisdiction: `Exporteur-Sitz (${verdict.authority})`,
          authority: "EU_COMPETENT_AUTHORITY",
          status: "PROHIBITED",
          licenseType: null,
          reason: `Ausfuhr nach dem Recht des Exporteur-Sitzes verboten (Behörde ${verdict.authority}) — kein Genehmigungsweg. ${reasonText(verdict)}`,
          recommendedAction: `NICHT AUSFÜHREN. Operation abbrechen und dokumentieren. Etwaige enge Ausnahmen nur mit qualifiziertem Exportkontroll-Rechtsberater prüfen.`,
          triggerCode: "ORIGIN_PROHIBITED",
        },
      ];
  }
}
