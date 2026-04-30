import "server-only";
import { cookies } from "next/headers";

/**
 * Comply v2 information-density toggle.
 *
 * Three modes:
 *   - cozy    — Linear-spacious. Default for new users; comfortable
 *               reading distance, generous padding. Best for Counsel
 *               and CEO personas onboarding to V2.
 *   - compact — middle ground. Operator power-users default here.
 *   - dense   — Bloomberg-tight. Mission-Control style, max info per
 *               viewport. Best for satellite-fleet operators.
 *
 * Stored as a cookie `caelex-comply-density`. Server Components read
 * it via `getDensity()` and apply `data-density="..."` on V2Shell;
 * v2 Card / List primitives respond via CSS `[&[data-density=...]]`
 * selectors.
 */

export type Density = "cozy" | "compact" | "dense";

export const DENSITY_COOKIE_NAME = "caelex-comply-density";

const VALID: ReadonlySet<string> = new Set(["cozy", "compact", "dense"]);

export function isDensity(value: unknown): value is Density {
  return typeof value === "string" && VALID.has(value);
}

/**
 * Read the user's density preference from the cookie. Falls back to
 * "compact" — the V2 default after the Palantir-aesthetic cutover.
 * Compact gives the Bloomberg-ish information density we want without
 * being overwhelming. Users who want the airier reading-room feel can
 * switch to "cozy" via Settings.
 */
export async function getDensity(): Promise<Density> {
  const store = await cookies();
  const raw = store.get(DENSITY_COOKIE_NAME)?.value;
  if (isDensity(raw)) return raw;
  return "compact";
}
