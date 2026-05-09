/**
 * Atlas Drafting — Mandate Intake Form (Bundle 31, S1).
 *
 * Marie typically works on ONE mandate at a time. Without an intake
 * form she re-enters the same client + satellite-specs + mission +
 * frequencies + launch-date into every tile she opens. With one, the
 * tiles become thin specializations on top of a shared context.
 *
 * MVP storage: localStorage, single active mandate. Bundle 36 will
 * upgrade to a per-matter binding (one intake per matter row in the
 * /atlas/network mandate index, switchable).
 *
 * Defensive shape-check on hydrate uses the same pattern as
 * comparator-annotations.ts and drafting-history.ts so a schema drift
 * doesn't crash the whole studio.
 */

export const MANDATE_INTAKE_KEY = "atlas-drafting-mandate-intake";

export interface MandateIntake {
  /** Mandant — who's the client. Free text. */
  client: string;
  /** Primary filing jurisdiction (matches OPERATOR_LABELS jurisdictions). */
  primaryJurisdiction: string;
  /** Operator type (matches OPERATOR_TYPES on the drafting page). */
  operatorType: string;
  /** Spacecraft / constellation specs. Free text. */
  satelliteSpecs: string;
  /** Mission profile (EO, telecom, IoT, etc.). Free text. */
  missionProfile: string;
  /** Frequencies / spectrum bands. Free text. */
  frequencies: string;
  /** Planned launch window. Free text (Q3/2027, May 2028, "TBD"). */
  launchDate: string;
}

export const EMPTY_INTAKE: MandateIntake = {
  client: "",
  primaryJurisdiction: "DE",
  operatorType: "satellite_operator",
  satelliteSpecs: "",
  missionProfile: "",
  frequencies: "",
  launchDate: "",
};

/** True when at least one substantive field is filled. */
export function isIntakeActive(intake: MandateIntake): boolean {
  return Boolean(
    intake.client.trim() ||
    intake.satelliteSpecs.trim() ||
    intake.missionProfile.trim() ||
    intake.frequencies.trim() ||
    intake.launchDate.trim(),
  );
}

const isIntake = (v: unknown): v is MandateIntake =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as MandateIntake).client === "string" &&
  typeof (v as MandateIntake).primaryJurisdiction === "string" &&
  typeof (v as MandateIntake).operatorType === "string" &&
  typeof (v as MandateIntake).satelliteSpecs === "string" &&
  typeof (v as MandateIntake).missionProfile === "string" &&
  typeof (v as MandateIntake).frequencies === "string" &&
  typeof (v as MandateIntake).launchDate === "string";

export function getMandateIntake(): MandateIntake {
  if (typeof window === "undefined") return EMPTY_INTAKE;
  try {
    const raw = window.localStorage.getItem(MANDATE_INTAKE_KEY);
    if (!raw) return EMPTY_INTAKE;
    const parsed = JSON.parse(raw);
    return isIntake(parsed) ? parsed : EMPTY_INTAKE;
  } catch {
    return EMPTY_INTAKE;
  }
}

export function setMandateIntake(intake: MandateIntake): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANDATE_INTAKE_KEY, JSON.stringify(intake));
  } catch {
    /* private browsing / quota — silent. */
  }
}

export function clearMandateIntake(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MANDATE_INTAKE_KEY);
  } catch {
    /* silent. */
  }
}

/**
 * Compose a one-line context string from the intake. Used to inject
 * mandate context into prompts for the Brief and Compare tiles
 * (Auth tile uses the intake fields directly via prefill, not via
 * appended context).
 *
 * Examples:
 *   DE: "Mandant: Sky-Sat GmbH | Konstellation: 12 LEO-Sats, 550 km |
 *        Mission: EO optical+SAR | Frequenzen: Ka-Band 28/18 GHz |
 *        Launch: Q3/2027"
 *   EN: "Client: Sky-Sat GmbH | Constellation: 12 LEO sats, 550 km |
 *        Mission: EO optical+SAR | Frequencies: Ka-band 28/18 GHz |
 *        Launch: Q3/2027"
 */
export function composeMandateContext(
  intake: MandateIntake,
  lang: "de" | "en",
): string {
  const labels =
    lang === "de"
      ? {
          client: "Mandant",
          specs: "Specs",
          mission: "Mission",
          freq: "Frequenzen",
          launch: "Launch",
        }
      : {
          client: "Client",
          specs: "Specs",
          mission: "Mission",
          freq: "Frequencies",
          launch: "Launch",
        };

  const parts: string[] = [];
  if (intake.client.trim())
    parts.push(`${labels.client}: ${intake.client.trim()}`);
  if (intake.satelliteSpecs.trim())
    parts.push(`${labels.specs}: ${intake.satelliteSpecs.trim()}`);
  if (intake.missionProfile.trim())
    parts.push(`${labels.mission}: ${intake.missionProfile.trim()}`);
  if (intake.frequencies.trim())
    parts.push(`${labels.freq}: ${intake.frequencies.trim()}`);
  if (intake.launchDate.trim())
    parts.push(`${labels.launch}: ${intake.launchDate.trim()}`);
  return parts.join(" | ");
}
