/**
 * Generate 2.0 — Readiness Engine
 *
 * Computes readiness scores for each NCA document type by checking
 * which required data fields are present in the user's data bundle.
 */

import "server-only";

import type {
  NCADocumentType,
  ReadinessResult,
  Generate2DataBundle,
  ReadinessField,
} from "./types";
import { READINESS_SCHEMAS } from "./readiness-schemas";
import { ALL_NCA_DOC_TYPES } from "./types";

// ─── Field Presence Check ───

/**
 * Determines whether a field is "present" (populated with meaningful data)
 * in the data bundle. Boolean fields are always considered present if the
 * source object exists (they have a definite true/false value). For all
 * other types, null / undefined / empty string / 0 counts as absent.
 */
function isFieldPresent(
  field: ReadinessField,
  data: Generate2DataBundle,
): boolean {
  const { source, field: fieldName } = field;

  // Spacecraft: special "length>=1" check
  if (source === "spacecraft") {
    return data.spacecraft.length >= 1;
  }

  // User fields: look in data.operator
  if (source === "user") {
    const value = data.operator[fieldName as keyof typeof data.operator];
    return value !== null && value !== undefined && value !== "";
  }

  // Organization fields: look in data.operator (organizationName is the only org field)
  if (source === "organization") {
    if (fieldName === "name") {
      return !!data.operator.organizationName;
    }
    return false;
  }

  // Debris / Cybersecurity: look in data[source]?.assessment[field]
  if (source === "debris") {
    const assessment = data.debris?.assessment;
    if (!assessment) return false;

    const value = assessment[fieldName as keyof typeof assessment];
    return isValuePresent(value, fieldName, assessment);
  }

  if (source === "cybersecurity") {
    const assessment = data.cybersecurity?.assessment;
    if (!assessment) return false;

    const value = assessment[fieldName as keyof typeof assessment];
    return isValuePresent(value, fieldName, assessment);
  }

  return false;
}

/**
 * Checks if a value is meaningfully present. Boolean fields are always
 * considered present (they carry information whether true or false).
 * For everything else, falsy values (null, undefined, "", 0) are absent.
 */
function isValuePresent(
  value: unknown,
  fieldName: string,
  assessment: Record<string, unknown>,
): boolean {
  if (value === null || value === undefined) return false;

  // Boolean fields are always present — true and false both carry meaning
  if (typeof value === "boolean") return true;

  // For non-boolean fields, 0 and empty string count as absent
  if (value === "") return false;
  if (value === 0) return false;

  // Field exists in the assessment object with a truthy value
  return fieldName in assessment && !!value;
}

// ─── Readiness Computation ───

/**
 * Computes the readiness score for a single NCA document type.
 *
 * Score = sum(present_field_weights) / sum(all_field_weights) * 100
 *
 * Levels:
 *   >= 80  -> "ready"
 *   >= 40  -> "partial"
 *   <  40  -> "insufficient"
 */
export function computeReadiness(
  docType: NCADocumentType,
  data: Generate2DataBundle,
): ReadinessResult {
  const schema = READINESS_SCHEMAS[docType];
  const { fields } = schema;

  let totalWeight = 0;
  let presentWeight = 0;
  let presentCount = 0;
  const missingCritical: string[] = [];

  for (const field of fields) {
    totalWeight += field.weight;

    if (isFieldPresent(field, data)) {
      presentWeight += field.weight;
      presentCount++;
    } else if (field.weight === 3) {
      // Track missing critical fields
      const label =
        field.source === "spacecraft"
          ? "spacecraft (at least 1)"
          : `${field.source}.${field.field}`;
      missingCritical.push(label);
    }
  }

  const score =
    totalWeight > 0 ? Math.round((presentWeight / totalWeight) * 100) : 0;

  let level: ReadinessResult["level"];
  if (score >= 80) {
    level = "ready";
  } else if (score >= 40) {
    level = "partial";
  } else {
    level = "insufficient";
  }

  return {
    documentType: docType,
    score,
    level,
    presentFields: presentCount,
    totalFields: fields.length,
    missingCritical,
  };
}

/**
 * Computes readiness scores for all 16 NCA document types.
 */
export function computeAllReadiness(
  data: Generate2DataBundle,
): ReadinessResult[] {
  return ALL_NCA_DOC_TYPES.map((docType) => computeReadiness(docType, data));
}
