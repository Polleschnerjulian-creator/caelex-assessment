/**
 * Background Autofill Engine (Sprint B2)
 *
 * Suggests field values for common operator forms based on:
 *   - File name / description patterns (regex catalogue)
 *   - Operator profile context (jurisdiction, operatorType, primaryOrbit)
 *   - Prior similar uploads (TODO Sprint B2.2 — DB look-up)
 *
 * Pure deterministic compute for Sprint B2 — no LLM call. The Astra
 * tool wraps this so operators can ask "I'm uploading X, help me
 * categorize it" via chat. UI integration into specific forms is a
 * follow-up (each form needs its own onChange hook).
 *
 * Soft-fail: empty input returns empty suggestions, never throws.
 */

import "server-only";

import { prisma } from "@/lib/prisma";

// ─── Public types ──────────────────────────────────────────────────────────

export type AutofillFormType =
  | "document-upload"
  | "spacecraft-create"
  | "incident-create"
  | "mission-create";

export interface AutofillRequest {
  formType: AutofillFormType;
  /** Current values the user has typed so far (free-form, form-specific). */
  currentValues: Record<string, unknown>;
  /** Optional: organization context to look up OperatorProfile. */
  organizationId?: string;
}

export interface AutofillFieldSuggestion {
  fieldName: string;
  suggestedValue: string | number | boolean;
  /** 0..1 — how confident the engine is in this suggestion. */
  confidence: number;
  /** Human-readable explanation shown next to the autofill chip. */
  reasoning: string;
  /** Which strategy produced the suggestion. */
  strategy:
    | "filename-pattern"
    | "operator-profile"
    | "prior-uploads"
    | "deterministic-default";
}

export interface AutofillResult {
  formType: AutofillFormType;
  suggestions: AutofillFieldSuggestion[];
  /** Telemetry. */
  durationMs: number;
  warnings: string[];
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function suggestFormAutofill(
  request: AutofillRequest,
): Promise<AutofillResult> {
  const t0 = Date.now();
  const warnings: string[] = [];

  let suggestions: AutofillFieldSuggestion[] = [];

  switch (request.formType) {
    case "document-upload":
      suggestions = suggestForDocumentUpload(request.currentValues, warnings);
      break;
    case "spacecraft-create":
      suggestions = await suggestForSpacecraftCreate(
        request.currentValues,
        request.organizationId,
        warnings,
      );
      break;
    case "incident-create":
      suggestions = suggestForIncidentCreate(request.currentValues, warnings);
      break;
    case "mission-create":
      suggestions = await suggestForMissionCreate(
        request.currentValues,
        request.organizationId,
        warnings,
      );
      break;
    default:
      warnings.push(`Unknown form type — no suggestions`);
  }

  // Sort by confidence desc, dedupe by fieldName (keep highest confidence).
  const byField = new Map<string, AutofillFieldSuggestion>();
  for (const s of suggestions.sort((a, b) => b.confidence - a.confidence)) {
    if (!byField.has(s.fieldName)) byField.set(s.fieldName, s);
  }

  return {
    formType: request.formType,
    suggestions: Array.from(byField.values()),
    durationMs: Date.now() - t0,
    warnings,
  };
}

// ─── Form-specific rules ───────────────────────────────────────────────────

// Document upload — driven by file name pattern.
const DOC_PATTERNS: Array<{
  pattern: RegExp;
  moduleType: string;
  regulatoryRef: string;
  category: string;
  reasoning: string;
}> = [
  {
    pattern: /authoriz|authorisation|antrag.*autoriza/i,
    moduleType: "AUTHORIZATION",
    regulatoryRef: "EU_SPACE_ACT_ART_7",
    category: "ANTRAG",
    reasoning:
      "Filename contains 'authoriz' — likely EU Space Act Art. 7 application",
  },
  {
    pattern: /licen[sc]e|permit/i,
    moduleType: "AUTHORIZATION",
    regulatoryRef: "EU_SPACE_ACT_ART_7",
    category: "LICENSE",
    reasoning: "Filename mentions license/permit — Authorization scope",
  },
  {
    pattern: /dpia|data.?protection.?impact/i,
    moduleType: "CYBERSECURITY",
    regulatoryRef: "GDPR_ART_35",
    category: "RISK_ASSESSMENT",
    reasoning: "Filename indicates a Data Protection Impact Assessment",
  },
  {
    pattern: /nis2|risk.?assess|isms/i,
    moduleType: "CYBERSECURITY",
    regulatoryRef: "NIS2_ART_21",
    category: "RISK_ASSESSMENT",
    reasoning: "Filename suggests NIS2 risk assessment / ISMS document",
  },
  {
    pattern: /debris|deorbit|passivation|end.?of.?life/i,
    moduleType: "DEBRIS_MITIGATION",
    regulatoryRef: "EU_SPACE_ACT_ART_70",
    category: "DEBRIS_PLAN",
    reasoning: "Filename references debris / deorbit — Art. 70 scope",
  },
  {
    pattern: /insurance|liability|haftpflicht/i,
    moduleType: "INSURANCE",
    regulatoryRef: "EU_SPACE_ACT_ART_18",
    category: "INSURANCE_CERTIFICATE",
    reasoning: "Filename indicates insurance / liability coverage",
  },
  {
    pattern: /spectrum|frequency|itu|sns/i,
    moduleType: "SPECTRUM",
    regulatoryRef: "ITU_RR",
    category: "SPECTRUM_FILING",
    reasoning: "Filename references spectrum / ITU coordination",
  },
  {
    pattern: /incident|breach|notification/i,
    moduleType: "INCIDENT_RESPONSE",
    regulatoryRef: "NIS2_ART_23",
    category: "INCIDENT_REPORT",
    reasoning: "Filename suggests an incident or breach notification",
  },
  {
    pattern: /export|itar|ear|dual.?use/i,
    moduleType: "EXPORT_CONTROL",
    regulatoryRef: "EU_DUAL_USE_2021_821",
    category: "EXPORT_CLASSIFICATION",
    reasoning: "Filename references export control",
  },
];

function suggestForDocumentUpload(
  values: Record<string, unknown>,
  warnings: string[],
): AutofillFieldSuggestion[] {
  const name = typeof values.name === "string" ? values.name : "";
  const description =
    typeof values.description === "string" ? values.description : "";
  const haystack = `${name} ${description}`.trim();

  if (!haystack) {
    warnings.push(
      "document-upload autofill needs at least a name or description",
    );
    return [];
  }

  const out: AutofillFieldSuggestion[] = [];
  for (const rule of DOC_PATTERNS) {
    if (!rule.pattern.test(haystack)) continue;

    // Don't override values the user already set.
    if (!values.moduleType) {
      out.push({
        fieldName: "moduleType",
        suggestedValue: rule.moduleType,
        confidence: 0.85,
        reasoning: rule.reasoning,
        strategy: "filename-pattern",
      });
    }
    if (!values.regulatoryRef) {
      out.push({
        fieldName: "regulatoryRef",
        suggestedValue: rule.regulatoryRef,
        confidence: 0.8,
        reasoning: rule.reasoning,
        strategy: "filename-pattern",
      });
    }
    if (!values.category) {
      out.push({
        fieldName: "category",
        suggestedValue: rule.category,
        confidence: 0.75,
        reasoning: rule.reasoning,
        strategy: "filename-pattern",
      });
    }
    // First matching rule wins for category fields.
    break;
  }

  // Issue date: if filename contains a 4-digit year, suggest Jan 1 of that year.
  if (!values.issueDate) {
    const yearMatch = haystack.match(/\b(20[2-3]\d)\b/);
    if (yearMatch) {
      out.push({
        fieldName: "issueDate",
        suggestedValue: `${yearMatch[1]}-01-01`,
        confidence: 0.5,
        reasoning: `Year ${yearMatch[1]} extracted from filename — defaulting to Jan 1`,
        strategy: "filename-pattern",
      });
    }
  }

  return out;
}

// Spacecraft — driven by OperatorProfile orbit + size.
async function suggestForSpacecraftCreate(
  values: Record<string, unknown>,
  organizationId: string | undefined,
  warnings: string[],
): Promise<AutofillFieldSuggestion[]> {
  if (!organizationId) {
    warnings.push("spacecraft-create autofill needs organizationId");
    return [];
  }

  const operator = await prisma.operatorProfile
    .findUnique({
      where: { organizationId },
      select: {
        primaryOrbit: true,
        orbitAltitudeKm: true,
        satelliteMassKg: true,
        isConstellation: true,
        missionDurationMonths: true,
        establishment: true,
      },
    })
    .catch(() => null);

  if (!operator) {
    warnings.push(
      "No OperatorProfile for this org — using deterministic defaults only",
    );
  }

  const out: AutofillFieldSuggestion[] = [];

  if (!values.orbitType && operator?.primaryOrbit) {
    out.push({
      fieldName: "orbitType",
      suggestedValue: operator.primaryOrbit,
      confidence: 0.9,
      reasoning: `Operator profile primaryOrbit=${operator.primaryOrbit}`,
      strategy: "operator-profile",
    });
  }
  if (!values.altitudeKm && operator?.orbitAltitudeKm) {
    out.push({
      fieldName: "altitudeKm",
      suggestedValue: operator.orbitAltitudeKm,
      confidence: 0.85,
      reasoning: `OperatorProfile.orbitAltitudeKm=${operator.orbitAltitudeKm}`,
      strategy: "operator-profile",
    });
  }
  if (!values.massKg && operator?.satelliteMassKg) {
    out.push({
      fieldName: "massKg",
      suggestedValue: operator.satelliteMassKg,
      confidence: 0.8,
      reasoning: `OperatorProfile.satelliteMassKg=${operator.satelliteMassKg}`,
      strategy: "operator-profile",
    });
  }
  if (!values.expectedLifetimeMonths && operator?.missionDurationMonths) {
    out.push({
      fieldName: "expectedLifetimeMonths",
      suggestedValue: operator.missionDurationMonths,
      confidence: 0.8,
      reasoning: `OperatorProfile.missionDurationMonths=${operator.missionDurationMonths}`,
      strategy: "operator-profile",
    });
  }
  if (!values.jurisdictionOfRegistration && operator?.establishment) {
    out.push({
      fieldName: "jurisdictionOfRegistration",
      suggestedValue: operator.establishment,
      confidence: 0.85,
      reasoning: `OperatorProfile.establishment=${operator.establishment}`,
      strategy: "operator-profile",
    });
  }

  return out;
}

// Incident — derive severity + nis2Phase from description keywords.
function suggestForIncidentCreate(
  values: Record<string, unknown>,
  warnings: string[],
): AutofillFieldSuggestion[] {
  const description =
    typeof values.description === "string" ? values.description : "";
  if (!description) {
    warnings.push("incident-create autofill needs a description");
    return [];
  }

  const lc = description.toLowerCase();
  const out: AutofillFieldSuggestion[] = [];

  if (!values.severity) {
    let severity: string | null = null;
    let confidence = 0.7;
    let reasoning = "";
    if (/critical|catastrop|complete.?loss|major.?outage/.test(lc)) {
      severity = "CRITICAL";
      reasoning = "Description mentions catastrophic / major outage keywords";
      confidence = 0.85;
    } else if (/high|severe|signific/.test(lc)) {
      severity = "HIGH";
      reasoning = "Description mentions severe / significant impact";
    } else if (/moderate|partial|degrad/.test(lc)) {
      severity = "MEDIUM";
      reasoning = "Description mentions moderate / partial degradation";
    } else if (/minor|low.?impact|negligible/.test(lc)) {
      severity = "LOW";
      reasoning = "Description mentions minor impact";
    }
    if (severity) {
      out.push({
        fieldName: "severity",
        suggestedValue: severity,
        confidence,
        reasoning,
        strategy: "filename-pattern",
      });
    }
  }

  if (!values.nis2Phase) {
    let phase: string | null = null;
    let reasoning = "";
    if (/discover|detected|noticed|spot/.test(lc)) {
      phase = "DETECTION";
      reasoning = "Description suggests we're in the detection phase";
    } else if (/triag|investigat|assess/.test(lc)) {
      phase = "TRIAGE";
      reasoning = "Description suggests we're triaging / investigating";
    } else if (/notif|report|notif.*authoriti/.test(lc)) {
      phase = "NOTIFICATION";
      reasoning = "Description indicates regulatory notification phase";
    } else if (/respon|remediat|recover|contain/.test(lc)) {
      phase = "RESPONSE";
      reasoning = "Description indicates response / containment phase";
    }
    if (phase) {
      out.push({
        fieldName: "nis2Phase",
        suggestedValue: phase,
        confidence: 0.7,
        reasoning,
        strategy: "filename-pattern",
      });
    }
  }

  return out;
}

// Mission — defaults from OperatorProfile.
async function suggestForMissionCreate(
  values: Record<string, unknown>,
  organizationId: string | undefined,
  warnings: string[],
): Promise<AutofillFieldSuggestion[]> {
  if (!organizationId) {
    warnings.push("mission-create autofill needs organizationId");
    return [];
  }

  const operator = await prisma.operatorProfile
    .findUnique({
      where: { organizationId },
      select: {
        primaryOrbit: true,
        plannedLaunchDate: true,
        operatorType: true,
        euOperatorCode: true,
      },
    })
    .catch(() => null);

  if (!operator) return [];

  const out: AutofillFieldSuggestion[] = [];

  if (
    !values.missionType &&
    (operator.euOperatorCode ?? operator.operatorType)
  ) {
    const code = operator.euOperatorCode ?? operator.operatorType ?? "";
    const missionType =
      code === "LO"
        ? "LAUNCH"
        : code === "SCO"
          ? "EARTH_OBSERVATION"
          : code === "ISOS"
            ? "IN_ORBIT_SERVICE"
            : null;
    if (missionType) {
      out.push({
        fieldName: "missionType",
        suggestedValue: missionType,
        confidence: 0.7,
        reasoning: `Inferred from OperatorProfile.euOperatorCode=${code}`,
        strategy: "operator-profile",
      });
    }
  }

  if (!values.plannedStartAt && operator.plannedLaunchDate) {
    out.push({
      fieldName: "plannedStartAt",
      suggestedValue: operator.plannedLaunchDate.toISOString(),
      confidence: 0.85,
      reasoning: `OperatorProfile.plannedLaunchDate=${operator.plannedLaunchDate.toISOString().slice(0, 10)}`,
      strategy: "operator-profile",
    });
  }

  return out;
}
