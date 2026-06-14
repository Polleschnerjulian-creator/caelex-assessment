// src/lib/trade/intake/attribute-fields.ts
import { ATTRIBUTE_SANITY_RANGES } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

export interface AttributeField {
  attribute: AttributeName;
  label: string;
  unit?: string;
  kind: "number" | "boolean" | "enum" | "string";
  enumValues?: string[];
  help?: string;
}

/** Editorial metadata for every attribute the v1 catalog can render. Bounds are
 *  NOT redefined here — validation reuses ATTRIBUTE_SANITY_RANGES (the matcher's
 *  actual UNKNOWN-routing bound) so the form and matcher agree by construction. */
export const ATTRIBUTE_FIELDS: Partial<Record<AttributeName, AttributeField>> =
  {
    starTrackerAccuracyArcsec: {
      attribute: "starTrackerAccuracyArcsec",
      label: "Genauigkeit (1σ)",
      unit: "arcsec",
      kind: "number",
      help: "Kreuz-Boresight-Genauigkeit; ITAR-Schwelle ≤ 1 arcsec.",
    },
    starTrackerSlewRateDegPerS: {
      attribute: "starTrackerSlewRateDegPerS",
      label: "Slew-Rate-Toleranz",
      unit: "°/s",
      kind: "number",
      help: "ITAR-Schwelle ≥ 3 °/s (konjunktiv mit Genauigkeit).",
    },
    gnssMaxVelocityMPerS: {
      attribute: "gnssMaxVelocityMPerS",
      label: "Max. Geschwindigkeit",
      unit: "m/s",
      kind: "number",
      help: "MTCR/EAR-Schwelle ≥ 600 m/s.",
    },
    radHardTidKrad: {
      attribute: "radHardTidKrad",
      label: "Strahlungshärte (TID)",
      unit: "krad",
      kind: "number",
    },
    isRadHardened: {
      attribute: "isRadHardened",
      label: "Strahlungsgehärtet",
      kind: "boolean",
    },
    isSpeciallyDesigned: {
      attribute: "isSpeciallyDesigned",
      label: "Speziell konstruiert (specially designed)",
      kind: "boolean",
    },
    payloadKg: {
      attribute: "payloadKg",
      label: "Nutzlast",
      unit: "kg",
      kind: "number",
    },
    rangeKm: {
      attribute: "rangeKm",
      label: "Reichweite",
      unit: "km",
      kind: "number",
    },
    frequencyGhz: {
      attribute: "frequencyGhz",
      label: "Frequenz",
      unit: "GHz",
      kind: "number",
    },
    thrustNewtons: {
      attribute: "thrustNewtons",
      label: "Schub",
      unit: "N",
      kind: "number",
    },
    specificImpulseSecondsVacuum: {
      attribute: "specificImpulseSecondsVacuum",
      label: "Spezifischer Impuls (Vakuum)",
      unit: "s",
      kind: "number",
    },
    apertureMeters: {
      attribute: "apertureMeters",
      label: "Apertur",
      unit: "m",
      kind: "number",
    },
    gsdMeters: {
      attribute: "gsdMeters",
      label: "Bodenauflösung (GSD)",
      unit: "m",
      kind: "number",
    },
    // …implementer adds one entry per attribute returned by deriveRelevantAttributes
    // for each of the 12 v1 categories (Task 7). The completeness test (Task 7)
    // fails the build if any rendered attribute lacks an entry here.
  };

export function getAttributeField(
  a: AttributeName,
): AttributeField | undefined {
  return ATTRIBUTE_FIELDS[a];
}

export function validateAttributeValue(
  a: AttributeName,
  value: number | boolean | string,
): { ok: boolean; reason?: string } {
  const bound = ATTRIBUTE_SANITY_RANGES[a];
  if (bound && typeof value === "number") {
    if (!Number.isFinite(value) || value < bound.min || value > bound.max) {
      return {
        ok: false,
        reason: `Wert ${value} außerhalb des plausiblen Bereichs (${bound.min}–${bound.max}). Möglicher Einheitenfehler.`,
      };
    }
  }
  return { ok: true };
}
