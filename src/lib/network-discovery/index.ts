/**
 * Caelex Comply — Trilateral Network Discovery (Sprint A4 — public entry)
 *
 * Combines NCA matcher + counsel matcher + cross-actor signal builder
 * into a single TrilateralDiscoveryResult that the onboarding UI
 * (or Astra tool) can render as the "Day-1 magic moment" affordance:
 *
 *     ✓ Caelex GmbH found (BRIS + GLEIF, T1 verified)
 *     ⚡ Suggested Counsel: Dr. Schmidt @ BHO Legal  [Invite]
 *     ⚡ Supervising NCAs: BMWK, BNetzA, BAFA       [Connect]
 *
 * Never throws. Returns a soft-failure result with warnings if input
 * is incomplete or downstream queries error out.
 */

import "server-only";

import { matchOperatorToNCAs } from "./operator-nca-matcher";
import { matchOperatorToCounsel } from "./operator-counsel-matcher";
import type {
  AuthoritySuggestion,
  CounselSuggestion,
  CrossActorSignal,
  DiscoveryInput,
  DiscoveryMeta,
  TrilateralDiscoveryResult,
} from "./types";

export type {
  DiscoveryInput,
  TrilateralDiscoveryResult,
  AuthoritySuggestion,
  CounselSuggestion,
  CrossActorSignal,
} from "./types";

// ─── Public API ────────────────────────────────────────────────────────────

export async function runTrilateralDiscovery(
  input: DiscoveryInput,
): Promise<TrilateralDiscoveryResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];

  // Validate.
  if (!input.organizationId) {
    return emptyResult(startedAt, t0, false, [
      "Discovery skipped: organizationId is required",
    ]);
  }
  if (!input.operatorType) {
    warnings.push("operatorType not provided; NCA discovery will be skipped");
  }
  if (!input.establishmentCountry) {
    warnings.push(
      "establishmentCountry not provided; NCA discovery will be skipped",
    );
  }

  // Run authority + counsel matchers in parallel.
  const authoritiesP = Promise.resolve().then(() => matchOperatorToNCAs(input));
  const counselP = matchOperatorToCounsel(input).catch((err) => {
    warnings.push(
      `Counsel matcher failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    return { counsel: [], warnings: [] as string[] };
  });

  const [authorities, counselResult] = await Promise.all([
    authoritiesP,
    counselP,
  ]);
  const counsel = counselResult.counsel;
  warnings.push(...counselResult.warnings);

  // Build cross-actor signals from the matched results.
  const signals = buildCrossActorSignals(input, authorities, counsel);

  return {
    authorities,
    counsel,
    signals,
    meta: {
      startedAt,
      durationMs: Date.now() - t0,
      inputComplete: Boolean(input.operatorType && input.establishmentCountry),
      warnings,
    },
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function emptyResult(
  startedAt: string,
  t0: number,
  inputComplete: boolean,
  warnings: string[],
): TrilateralDiscoveryResult {
  return {
    authorities: [],
    counsel: [],
    signals: [],
    meta: emptyMeta(startedAt, t0, inputComplete, warnings),
  };
}

function emptyMeta(
  startedAt: string,
  t0: number,
  inputComplete: boolean,
  warnings: string[],
): DiscoveryMeta {
  return {
    startedAt,
    durationMs: Date.now() - t0,
    inputComplete,
    warnings,
  };
}

/**
 * Compose the visible "Day-1 magic moment" signals from matcher results.
 *
 * Each signal becomes a banner / CTA in the onboarding UI. Patterns 3-5
 * (counsel-search-alert, authority-pipeline-share, cross-operator-anomaly)
 * are out-of-scope for Sprint A4 — they require cross-tenant reads and a
 * subscription model. Surfaced as commented placeholders.
 */
function buildCrossActorSignals(
  input: DiscoveryInput,
  authorities: AuthoritySuggestion[],
  counsel: CounselSuggestion[],
): CrossActorSignal[] {
  const signals: CrossActorSignal[] = [];

  // Pattern 2 — Operator → NCA auto-detection.
  if (authorities.length > 0) {
    const primary = authorities.find((a) => a.primary) ?? authorities[0]!;
    signals.push({
      kind: "oversight-handshake-ready",
      label: `Supervising NCA${authorities.length > 1 ? "s" : ""} auto-detected: ${authorities
        .map((a) => a.name)
        .join(", ")}`,
      severity: "info",
      cta: {
        label: "Connect oversight",
        href: `/dashboard/nca-portal?primaryNca=${encodeURIComponent(primary.ncaId)}`,
      },
      details: {
        ncaCount: authorities.length,
        pathway: primary.pathway,
        estimatedTimeline: primary.estimatedTimeline,
      },
    });
  }

  // Pattern 1 — Operator → Counsel match.
  // Filter out the stub placeholder when emitting a real signal.
  const realCounsel = counsel.filter((c) => c.matchStrategy !== "stub");
  if (realCounsel.length > 0) {
    const top = realCounsel[0]!;
    signals.push({
      kind: "mandate-invite-ready",
      label: `Suggested counsel: ${top.firmName}${top.reasoning ? ` (${top.reasoning})` : ""}`,
      severity: "info",
      cta: {
        label: "Invite to mandate",
        href: `/dashboard/network?action=invite-counsel&firm=${encodeURIComponent(top.firmName)}`,
      },
      details: {
        firmName: top.firmName,
        confidence: top.confidence,
        matchStrategy: top.matchStrategy,
      },
    });
  } else if (counsel.length > 0) {
    // Stub-only result: show a subtler "browse directory" signal.
    signals.push({
      kind: "mandate-invite-ready",
      label:
        "No automatic counsel match yet — browse the directory or invite manually",
      severity: "info",
      cta: { label: "Browse Atlas Directory", href: "/dashboard/network" },
      details: { matchStrategy: "stub" },
    });
  }

  return signals;
}
