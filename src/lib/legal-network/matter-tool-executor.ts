import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Matter Tool Executor — actually runs the Claude-callable tools
 * defined in matter-tools.ts.
 *
 * Every tool call follows the same pattern:
 *   1. Validate input schema (Zod)
 *   2. `requireActiveMatter({ category, permission: "READ" })` — the
 *      single enforcement seam. Fails if scope insufficient, matter
 *      inactive, or caller not a party.
 *   3. Fetch data from the Caelex core, scoped to matter.clientOrgId
 *   4. Summarise into a size-bounded JSON payload
 *   5. `emitAccessLog` — hash-chain tamper-evident audit entry
 *   6. Return JSON string to Claude
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { LegalMatter } from "@prisma/client";
import {
  requireActiveMatter,
  emitAccessLog,
  MatterAccessError,
} from "./require-matter";
import type { MatterToolName } from "./matter-tools";

// ─── Error surface ────────────────────────────────────────────────────

export interface ToolExecutionResult {
  /** JSON-string payload passed back to Claude. */
  content: string;
  /** If true, the tool call failed — Claude should not treat the output
   *  as authoritative data; it's an error message it should surface
   *  transparently to the user. */
  isError: boolean;
}

// ─── Input schemas ────────────────────────────────────────────────────

const LoadComplianceOverviewInput = z.object({
  detail_level: z.enum(["summary", "full"]).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────

function errOutput(message: string, code?: string): ToolExecutionResult {
  return {
    content: JSON.stringify({ error: message, code }),
    isError: true,
  };
}

// ─── load_compliance_overview ─────────────────────────────────────────

async function loadComplianceOverview(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
}): Promise<ToolExecutionResult> {
  const parsed = LoadComplianceOverviewInput.safeParse(args.input);
  if (!parsed.success) {
    return errOutput("Invalid tool input", "INVALID_INPUT");
  }
  const detail = parsed.data.detail_level ?? "summary";

  // Scope gate — READ on COMPLIANCE_ASSESSMENTS
  try {
    await requireActiveMatter({
      matterId: args.matter.id,
      callerOrgId: args.actorOrgId,
      callerSide: "ATLAS",
      category: "COMPLIANCE_ASSESSMENTS",
      permission: "READ",
    });
  } catch (err) {
    if (err instanceof MatterAccessError) {
      return errOutput(
        `Access denied: ${err.message}. Ask the user to request a scope amendment on COMPLIANCE_ASSESSMENTS.`,
        err.code,
      );
    }
    throw err;
  }

  // Fetch data scoped to the client org
  const orgId = args.matter.clientOrgId;
  const [cyber, nis2, debris, insurance, environmental] = await Promise.all([
    prisma.cybersecurityAssessment.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        assessmentName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: detail === "full" ? 3 : 50,
    }),
    prisma.nIS2Assessment.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        assessmentName: true,
        entityClassification: true,
        classificationReason: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: detail === "full" ? 3 : 50,
    }),
    prisma.debrisAssessment.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        missionName: true,
        orbitType: true,
        satelliteCount: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: detail === "full" ? 3 : 50,
    }),
    prisma.insuranceAssessment.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        assessmentName: true,
        primaryJurisdiction: true,
        operatorType: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: detail === "full" ? 3 : 50,
    }),
    prisma.environmentalAssessment.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        assessmentName: true,
        status: true,
        operatorType: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: detail === "full" ? 3 : 50,
    }),
  ]);

  const summary = {
    scope: "COMPLIANCE_ASSESSMENTS",
    client_org_id: orgId,
    counts: {
      cybersecurity: cyber.length,
      nis2: nis2.length,
      debris: debris.length,
      insurance: insurance.length,
      environmental: environmental.length,
    },
    nis2_classifications: nis2
      .map((n) => n.entityClassification)
      .filter((c): c is string => !!c),
    latest_updated_at: {
      cybersecurity: cyber[0]?.updatedAt ?? null,
      nis2: nis2[0]?.updatedAt ?? null,
      debris: debris[0]?.updatedAt ?? null,
      insurance: insurance[0]?.updatedAt ?? null,
      environmental: environmental[0]?.updatedAt ?? null,
    },
    ...(detail === "full"
      ? {
          recent: {
            cybersecurity: cyber,
            nis2: nis2,
            debris: debris,
            insurance: insurance,
            environmental: environmental,
          },
        }
      : {}),
  };

  // Audit-log the successful data access — one entry per tool call
  await emitAccessLog({
    matter: args.matter,
    actorUserId: args.actorUserId,
    actorOrgId: args.actorOrgId,
    actorSide: "ATLAS",
    action: "READ_ASSESSMENT",
    resourceType: "ComplianceOverview",
    resourceId: null,
    matterScope: "COMPLIANCE_ASSESSMENTS",
    context: {
      tool: "load_compliance_overview",
      detail_level: detail,
      counts: summary.counts,
    },
  });

  return { content: JSON.stringify(summary), isError: false };
}

// ─── Dispatcher ───────────────────────────────────────────────────────

export async function executeTool(args: {
  name: MatterToolName;
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
}): Promise<ToolExecutionResult> {
  switch (args.name) {
    case "load_compliance_overview":
      return loadComplianceOverview(args);
    default: {
      // Exhaustiveness check — if a new tool is added to MatterToolName
      // but not wired here, TS flags it.
      const _never: never = args.name;
      return errOutput(`Unknown tool: ${String(_never)}`, "UNKNOWN_TOOL");
    }
  }
}
