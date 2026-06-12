/**
 * Origin→Regime-Routing (Spec 2026-06-12 §4.2).
 *
 * BEGRIFFSTRENNUNG (verbindlich, Lehre aus T-H6):
 *   Exporteur-SITZ (Org-Profil-Land)  → bestimmt das anwendbare Ausfuhrrecht (DIESE Map).
 *   Item-countryOfOrigin              → füttert NUR Re-Export-Logik (De-minimis/FDPR).
 *
 * Pure data — kein I/O, kein Prisma, kein AI-Call.
 */
import type { ListId } from "./order-of-review";
import { EU27_MEMBER_STATES } from "../eu-member-states";

export interface OriginRegimeRouting {
  /** Primäres Dual-Use-Regime des Origins (trägt das Verdict). */
  dualUsePrimary: ListId;
  /** Primäres Militärgüter-Regime; null = (noch) keines im Korpus modelliert. */
  militaryPrimary: ListId | null;
  /** Informational, NIE primär — bestehende order-of-review-Architektur. */
  multilateralBaseline: readonly ListId[];
  /** false ⇒ Fail-Closed-Regel 4.3b (REVIEW „Origin nicht unterstützt"). */
  supported: boolean;
}

const MULTILATERAL: readonly ListId[] = ["WASSENAAR", "MTCR", "NSG", "AG"];

const NON_EU_ROUTES: Record<
  string,
  Omit<OriginRegimeRouting, "multilateralBaseline" | "supported">
> = {
  GB: { dualUsePrimary: "UK_STRATEGIC", militaryPrimary: "UK_STRATEGIC" },
  US: { dualUsePrimary: "EAR_CCL", militaryPrimary: "USML" },
  CH: { dualUsePrimary: "CH_GKV", militaryPrimary: null },
  NO: { dualUsePrimary: "NO_LIST", militaryPrimary: null },
  CA: { dualUsePrimary: "CA_ECL", militaryPrimary: null },
  JP: { dualUsePrimary: "JP_METI", militaryPrimary: null },
  AU: { dualUsePrimary: "AU_DSGL", militaryPrimary: null },
  KR: { dualUsePrimary: "KR_STRATEGIC", militaryPrimary: null },
  IN: { dualUsePrimary: "IN_SCOMET", militaryPrimary: null },
};

/** Alle Kreis-A-ISO2 (EU-27 ausgerollt + 9 weitere). */
export const KREIS_A_ISO2: ReadonlySet<string> = new Set([
  ...EU27_MEMBER_STATES,
  ...Object.keys(NON_EU_ROUTES),
]);

const UNSUPPORTED: OriginRegimeRouting = {
  dualUsePrimary: "EU_ANNEX_I", // nie konsumiert: supported=false gewinnt überall
  militaryPrimary: null,
  multilateralBaseline: MULTILATERAL,
  supported: false,
};

export function originRegimes(
  originIso2: string | null | undefined,
): OriginRegimeRouting {
  const iso = (originIso2 ?? "").trim().toUpperCase();
  if (!iso) return UNSUPPORTED;
  if (EU27_MEMBER_STATES.has(iso)) {
    return {
      dualUsePrimary: "EU_ANNEX_I",
      militaryPrimary: "EU_CML",
      multilateralBaseline: MULTILATERAL,
      supported: true,
    };
  }
  const route = NON_EU_ROUTES[iso];
  if (!route) return UNSUPPORTED;
  return { ...route, multilateralBaseline: MULTILATERAL, supported: true };
}
