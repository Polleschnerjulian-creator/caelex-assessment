/**
 * Atlas Drafting — Client-fact extractor (Bundle 39, B4).
 *
 * When a mandant emails Marie ("we're a 10-sat LEO operator, headed for
 * Q3/2027 launch, Ka-band 28/18, looking for the BNetzA filing"), she
 * has to read the email, find the relevant facts, and re-type them into
 * the mandate intake form. This module bridges the gap.
 *
 * Workflow:
 *   1. Marie pastes the mandant email into the extractor modal.
 *   2. Modal builds a structured-extraction prompt that asks Astra to
 *      return JSON with the intake-shape keys.
 *   3. Modal dispatches the prompt to AI Mode.
 *   4. Astra returns JSON. Marie copies it back into the modal's
 *      "AI response" textarea.
 *   5. Modal parses + applies the JSON to the active mandate's intake.
 *
 * Direct AI integration (no copy-paste) requires a server-side API
 * call to Anthropic, which we don't yet have here. For now the JSON
 * round-trip is the MVP. The schema validation guarantees only valid
 * fields ever reach the intake.
 */

import { EMPTY_INTAKE, type MandateIntake } from "./mandate-intake";

/**
 * Build the structured-extraction prompt. The model is instructed to
 * return ONLY JSON with the eight intake-shape keys, omitting any field
 * it cannot infer with confidence.
 */
export function buildExtractionPrompt(
  emailBody: string,
  lang: "de" | "en",
): string {
  const fieldList = `
- client (string): full legal name of the client / mandant
- primaryJurisdiction (string): two-letter ISO code, e.g. "DE", "FR", "UK"
- operatorType (string): one of "satellite_operator", "launch_provider", "ground_segment", "data_provider", "in_orbit_services", "constellation_operator", "space_resource_operator"
- satelliteSpecs (string): free-form spec line, e.g. "12 LEO sats × 250 kg, 550 km altitude"
- missionProfile (string): primary mission, e.g. "Earth observation, optical + SAR"
- frequencies (string): spectrum bands, e.g. "Ka-band 28/18 GHz"
- launchDate (string): planned launch window, e.g. "Q3/2027" or "May 2028"
`.trim();

  if (lang === "de") {
    return `Extrahiere aus der folgenden Mandanten-E-Mail die Mandanten-Intake-Daten. Gib NUR ein JSON-Objekt mit den unten genannten Schlüsseln zurück (omit ein Feld, wenn es nicht klar im Text steht — keine Annahmen). Antworte ohne weitere Erklärung — nur das JSON.

Felder:
${fieldList}

Mandanten-E-Mail:
"""
${emailBody.trim()}
"""

JSON:`;
  }
  return `Extract the mandate-intake data from the client email below. Return ONLY a JSON object with the keys listed below (omit a field if it isn't clearly stated in the text — no assumptions). Reply without commentary — just the JSON.

Fields:
${fieldList}

Client email:
"""
${emailBody.trim()}
"""

JSON:`;
}

/**
 * Parse the model's response and return a partial intake object. The
 * response usually contains the JSON wrapped in markdown code-fences;
 * we strip those defensively.
 *
 * Returns null when the response cannot be parsed at all. Returns a
 * partial Intake (only valid keys with string values) otherwise.
 */
export function parseExtractionResponse(
  response: string,
): Partial<MandateIntake> | null {
  if (!response.trim()) return null;

  /* Strip common code-fence wrappers. */
  let body = response.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) body = fence[1];

  /* Find the first { and the matching } at the end of the response. */
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  /* Whitelist fields. */
  const validKeys: (keyof MandateIntake)[] = [
    "client",
    "primaryJurisdiction",
    "operatorType",
    "satelliteSpecs",
    "missionProfile",
    "frequencies",
    "launchDate",
  ];
  const out: Partial<MandateIntake> = {};
  for (const k of validKeys) {
    const v = (parsed as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
  return out;
}

/**
 * Merge an extracted partial-intake into a full MandateIntake. Empty
 * fields in the patch are skipped — extraction never erases existing
 * data, only adds to it.
 */
export function mergeIntoIntake(
  base: MandateIntake,
  patch: Partial<MandateIntake>,
): MandateIntake {
  const next: MandateIntake = { ...EMPTY_INTAKE, ...base };
  for (const k of Object.keys(patch) as (keyof MandateIntake)[]) {
    const v = patch[k];
    if (typeof v === "string" && v.trim()) next[k] = v.trim();
  }
  return next;
}
