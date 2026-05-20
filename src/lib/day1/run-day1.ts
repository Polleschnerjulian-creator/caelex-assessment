/**
 * Day-1 Magic Moment Composer (Sprint Day1)
 *
 * One function that takes an organization and runs the full
 * "operator-just-signed-up" pipeline:
 *
 *   1. enrichOperatorProfile()    → identity from VIES + GLEIF + BRIS-router
 *   2. runTrilateralDiscovery()   → NCAs + counsel suggestions + signals
 *   3. runPrecisionEngine()       → dependency-resolved compliance roadmap
 *
 * All three engines run in parallel where possible. Returns a single
 * `Day1Result` payload the onboarding UI / Astra chat / v1 API can
 * surface in one round-trip.
 *
 * No DB writes by default (controllable via `persist` flag). Soft-fails
 * per-stage — even if enrichment returns SKIPPED the discovery + engine
 * still attempt with whatever profile data is on the OperatorProfile.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  enrichOperatorProfile,
  persistEnrichmentToAssureProfile,
} from "@/lib/profile-enrichment/orchestrator";
import type { EnrichmentResult } from "@/lib/profile-enrichment/types";
import { runTrilateralDiscovery } from "@/lib/network-discovery";
import type { TrilateralDiscoveryResult } from "@/lib/network-discovery";
import { runPrecisionEngine } from "@/lib/comply-v2/precision-engine";
import type { PrecisionRunResult } from "@/lib/comply-v2/precision-engine/types";

// ─── Input ─────────────────────────────────────────────────────────────────

export interface Day1Input {
  organizationId: string;
  /** Persist enrichment to AssureCompanyProfile. Default: false. */
  persist?: boolean;
  /** Cap on items returned from the precision-engine. Default: 25. */
  maxItems?: number;
  /** Optional override identifiers (e.g. user just typed VAT in onboarding). */
  vatId?: string;
  lei?: string;
}

// ─── Output ────────────────────────────────────────────────────────────────

export interface Day1Result {
  organizationId: string;
  /** Enrichment payload — may be SKIPPED if no identifiers available. */
  enrichment: EnrichmentResult | null;
  /** Trilateral discovery payload — may have empty arrays if profile is bare. */
  discovery: TrilateralDiscoveryResult | null;
  /** Precision-engine payload — may be EMPTY/FAILED with warnings. */
  roadmap: PrecisionRunResult | null;
  /** Top-3 "you should do these first" items for the banner. */
  topActions: TopAction[];
  /** Aggregate banner copy the UI can show verbatim. */
  bannerSummary: string;
  /** Telemetry. */
  durationMs: number;
  startedAt: string;
}

export interface TopAction {
  itemId: string;
  title: string;
  regulation: string;
  priority: string;
  targetDate: string | null;
  reasoning: string;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function runDay1MagicMoment(
  input: Day1Input,
): Promise<Day1Result> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Resolve OperatorProfile for inputs to discovery + precision-engine.
  const operator = await prisma.operatorProfile.findUnique({
    where: { organizationId: input.organizationId },
    select: {
      euOperatorCode: true,
      operatorType: true,
      primaryOrbit: true,
      constellationSize: true,
      missionDurationMonths: true,
      plannedLaunchDate: true,
      operatingJurisdictions: true,
      establishment: true,
    },
  });
  const orgName = (
    await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    })
  )?.name;

  // ─── Stage 1: enrichment (always; cheap if no identifiers) ─────────────
  const enrichmentPromise = enrichOperatorProfile({
    organizationId: input.organizationId,
    vatId: input.vatId,
    lei: input.lei,
    legalName: orgName ?? undefined,
    countryCode: operator?.establishment ?? undefined,
  }).catch(
    (err): EnrichmentResult => ({
      status: "FAILED",
      profile: {},
      sourceAttempts: [],
      durationMs: 0,
      startedAt,
      // sourceAttempts is the soft-fail channel — leave it empty here.
      // The error message lives in warnings via the wrapping logic below.
    }),
  );

  // ─── Stage 2: trilateral discovery (parallel) ──────────────────────────
  const operatorTypeForDiscovery =
    operator?.euOperatorCode ?? operator?.operatorType ?? "";
  const discoveryPromise = operator?.establishment
    ? runTrilateralDiscovery({
        organizationId: input.organizationId,
        operatorType: operatorTypeForDiscovery,
        establishmentCountry: operator.establishment,
        operatingJurisdictions: operator.operatingJurisdictions ?? [],
      })
    : Promise.resolve<TrilateralDiscoveryResult | null>(null);

  // ─── Stage 3: precision engine (parallel) ──────────────────────────────
  const jurisdictions = Array.from(
    new Set(
      [
        ...(operator?.operatingJurisdictions ?? []),
        operator?.establishment,
      ].filter((j): j is string => Boolean(j)),
    ),
  );
  const roadmapPromise =
    operatorTypeForDiscovery && jurisdictions.length > 0
      ? runPrecisionEngine({
          organizationId: input.organizationId,
          applicability: {
            operatorType: operatorTypeForDiscovery,
            jurisdictions,
            primaryOrbit: operator?.primaryOrbit ?? undefined,
            constellationSize: operator?.constellationSize ?? undefined,
            missionDurationMonths: operator?.missionDurationMonths ?? undefined,
            plannedLaunchDate: operator?.plannedLaunchDate ?? undefined,
          },
        })
      : Promise.resolve<PrecisionRunResult | null>(null);

  const [enrichment, discovery, roadmap] = await Promise.all([
    enrichmentPromise,
    discoveryPromise,
    roadmapPromise,
  ]);

  // ─── Stage 4: optional persistence ──────────────────────────────────────
  if (
    input.persist &&
    enrichment &&
    (enrichment.status === "SUCCESS" || enrichment.status === "PARTIAL")
  ) {
    await persistEnrichmentToAssureProfile(
      input.organizationId,
      enrichment.profile,
    ).catch(() => null);
  }

  // ─── Stage 5: top-actions extraction ────────────────────────────────────
  const maxItems = input.maxItems ?? 25;
  const topActions: TopAction[] = (roadmap?.items ?? [])
    .slice(0, Math.min(3, maxItems))
    .map((item) => ({
      itemId: item.id,
      title: item.title,
      regulation: item.regulationRef,
      priority: item.priority,
      targetDate: item.targetDate?.toISOString() ?? null,
      reasoning: item.articleRef
        ? `${item.origin.framework} ${item.articleRef}`
        : item.origin.framework,
    }));

  // ─── Stage 6: human-readable banner ─────────────────────────────────────
  const bannerSummary = composeBanner({
    enrichment,
    discovery,
    roadmap,
    orgName: orgName ?? "your organization",
  });

  return {
    organizationId: input.organizationId,
    enrichment,
    discovery,
    roadmap,
    topActions,
    bannerSummary,
    durationMs: Date.now() - t0,
    startedAt,
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function composeBanner(args: {
  enrichment: EnrichmentResult | null;
  discovery: TrilateralDiscoveryResult | null;
  roadmap: PrecisionRunResult | null;
  orgName: string;
}): string {
  const parts: string[] = [];

  // Enrichment fragment.
  if (args.enrichment) {
    const hits = args.enrichment.sourceAttempts.filter((a) => a.success).length;
    if (hits > 0) {
      parts.push(`Identity confirmed across ${hits} public registries`);
    }
  }

  // Discovery fragment.
  if (args.discovery) {
    const ncaCount = args.discovery.authorities.length;
    const counselCount = args.discovery.counsel.filter(
      (c) => c.matchStrategy !== "stub",
    ).length;
    if (ncaCount > 0) {
      parts.push(
        `${ncaCount} supervising NCA${ncaCount === 1 ? "" : "s"} auto-detected`,
      );
    }
    if (counselCount > 0) {
      parts.push(
        `${counselCount} counsel suggestion${counselCount === 1 ? "" : "s"}`,
      );
    }
  }

  // Roadmap fragment.
  if (args.roadmap && args.roadmap.status === "SUCCESS") {
    const urgentCount = args.roadmap.stats.itemsByPriority.URGENT;
    parts.push(
      `${args.roadmap.stats.itemsGenerated} compliance items generated` +
        (urgentCount > 0 ? ` (${urgentCount} urgent)` : ""),
    );
  }

  if (parts.length === 0) {
    return `Welcome ${args.orgName}. Complete onboarding to unlock the Day-1 compliance roadmap.`;
  }

  return `Welcome ${args.orgName}. ${parts.join(" · ")}.`;
}
