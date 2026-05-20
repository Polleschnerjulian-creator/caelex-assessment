/**
 * Operator → Counsel Matcher (Sprint A4, Trilateral Pattern 1)
 *
 * Auto-suggests legal counsel for a new operator based on existing
 * Caelex mandates + the operator's own stakeholder engagements.
 *
 * Strategy (in order of confidence — best first):
 *   1. The operator's own StakeholderEngagement entries whose
 *      stakeholderType is LEGAL_COUNSEL — these are firms the
 *      operator has already worked with.
 *   2. (Sprint A4.2) Atlas LegalMatter records where the firm's
 *      jurisdictions overlap with the operator's establishment
 *      country + operatorType. Currently a stub: returns no matches.
 *   3. (Sprint A4.3) Atlas directory search — firms advertising
 *      capabilities matching this operator. Currently a stub.
 *
 * Never throws. Soft-fails to an empty list with warnings if the
 * underlying tables don't yet exist or queries error out.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import type { CounselSuggestion, DiscoveryInput } from "./types";

const STAKEHOLDER_CONFIDENCE = 0.95;

/**
 * Match counsel candidates for the operator.
 *
 * Returns up to `maxResults` suggestions (default 5).
 */
export async function matchOperatorToCounsel(
  input: DiscoveryInput,
  options: { maxResults?: number } = {},
): Promise<{ counsel: CounselSuggestion[]; warnings: string[] }> {
  const maxResults = options.maxResults ?? 5;
  const warnings: string[] = [];
  const out: CounselSuggestion[] = [];

  // ─── Strategy 1: operator's own stakeholder engagements ─────────────────
  try {
    const engagements = await findExistingCounselStakeholders(
      input.organizationId,
    );
    for (const e of engagements) {
      if (out.length >= maxResults) break;
      out.push({
        firmName: e.firmName,
        countryCode: e.countryCode ?? input.establishmentCountry,
        existingMandateCount: 1, // we don't track cross-operator mandate counts here
        matchStrategy: "stakeholder-engagement",
        confidence: STAKEHOLDER_CONFIDENCE,
        contactHint: e.contactHint,
        reasoning: `Existing relationship in your stakeholder network (${e.relationshipType ?? "counsel"})`,
      });
    }
  } catch (err) {
    warnings.push(
      `stakeholder-engagement lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  // ─── Strategy 2: Atlas LegalMatter jurisdiction-match (stub) ────────────
  // Sprint A4 leaves this as a documented stub. The Atlas LegalMatter +
  // LegalAttorney models exist but they're in the TABU surface
  // (Phase A-D doesn't touch Atlas code). We surface a placeholder
  // CounselSuggestion only if we have zero results so far, to make the
  // UX clear ("we couldn't auto-match yet") rather than empty silence.
  if (out.length === 0) {
    out.push({
      firmName: "Browse Atlas Directory",
      countryCode: input.establishmentCountry,
      existingMandateCount: 0,
      matchStrategy: "stub",
      confidence: 0,
      reasoning:
        "No automatic counsel match available yet. Browse the Atlas legal-counsel directory or invite a firm manually.",
    });
  }

  return { counsel: out, warnings };
}

// ─── Internals ─────────────────────────────────────────────────────────────

interface CounselStakeholderRow {
  firmName: string;
  countryCode: string | null;
  relationshipType: string | null;
  contactHint?: string;
}

async function findExistingCounselStakeholders(
  organizationId: string,
): Promise<CounselStakeholderRow[]> {
  // StakeholderEngagement is a real Prisma model. We query loosely-typed
  // because the schema is shared with the legacy network UI, and we only
  // care about the LEGAL_COUNSEL / lawyer-tagged subset.
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await (prisma as any).stakeholderEngagement.findMany({
    where: {
      organizationId,
      // The stakeholderType field is a free string in the network model;
      // we match the conventional values used by /dashboard/network UI.
      stakeholderType: { in: ["LEGAL_COUNSEL", "law_firm", "counsel"] },
    },
    select: {
      stakeholderName: true,
      stakeholderCountry: true,
      relationshipType: true,
      contactEmail: true,
      contactWebsite: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return rows.map(
    (r): CounselStakeholderRow => ({
      firmName:
        typeof r.stakeholderName === "string"
          ? r.stakeholderName
          : "Unknown firm",
      countryCode:
        typeof r.stakeholderCountry === "string" ? r.stakeholderCountry : null,
      relationshipType:
        typeof r.relationshipType === "string" ? r.relationshipType : null,
      contactHint:
        typeof r.contactEmail === "string"
          ? r.contactEmail
          : typeof r.contactWebsite === "string"
            ? r.contactWebsite
            : undefined,
    }),
  );
}
