import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Pharos-Astra Tools — Read-only Tools, mit denen die Behörden-AI
 * Daten für laufende Aufsichten abfragen kann. Jeder Tool-Call ist
 * scope-gegated: das Tool resolvt zuerst die OversightRelationship
 * über die `authorityProfileId` des Callers — fremde Aufsichten sind
 * unsichtbar. Ein "Tool kann jetzt alles" ist explizit ausgeschlossen.
 *
 * Aktuelle Tools:
 *   1. query_operator_compliance(oversightId)
 *      → Compliance-Score, offene Vorfälle, überfällige Fristen
 *   2. summarize_audit_chain(oversightId, limit)
 *      → Letzte N Audit-Einträge (Hash-Chain bleibt verifizierbar)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import type Anthropic from "@anthropic-ai/sdk";
import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

export const PHAROS_ASTRA_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_operator_compliance",
    description:
      "Holt den aktuellen Compliance-Snapshot eines Operators für eine bestimmte Aufsicht. Liefert Compliance-Score (0-100), offene Vorfälle, überfällige Fristen, MDF/VDF-Kategorien. Nur Aufsichten der callenden Behörde sind zugreifbar.",
    input_schema: {
      type: "object",
      properties: {
        oversightId: {
          type: "string",
          description:
            "ID der Aufsichts-Beziehung (OversightRelationship.id, cuid).",
        },
      },
      required: ["oversightId"],
    },
  },
  {
    name: "summarize_audit_chain",
    description:
      "Liefert die letzten N Audit-Log-Einträge einer Aufsicht. Enthält für jeden Eintrag: Aktion (z.B. OVERSIGHT_ACCEPTED, OVERSIGHT_DATA_VIEWED), Akteur-Org, Resource, Zeitstempel und Hash-Chain-Position. Nur Aufsichten der callenden Behörde sind zugreifbar.",
    input_schema: {
      type: "object",
      properties: {
        oversightId: {
          type: "string",
          description:
            "ID der Aufsichts-Beziehung (OversightRelationship.id, cuid).",
        },
        limit: {
          type: "integer",
          description: "Anzahl der letzten Einträge (1-50, default 20).",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["oversightId"],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────

interface ToolContext {
  authorityProfileId: string;
}

interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Scope guard — confirms the oversight belongs to the caller's
 *  authority. Returns the loaded oversight or null. */
async function loadScopedOversight(
  oversightId: string,
  authorityProfileId: string,
) {
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: oversightId },
    include: {
      operatorOrg: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
  if (!oversight) return null;
  if (oversight.authorityProfileId !== authorityProfileId) return null;
  return oversight;
}

export async function executePharosAstraTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    if (name === "query_operator_compliance") {
      const oversightId = String(input.oversightId ?? "");
      if (!oversightId) {
        return { ok: false, error: "oversightId required" };
      }
      const oversight = await loadScopedOversight(
        oversightId,
        ctx.authorityProfileId,
      );
      if (!oversight) {
        return {
          ok: false,
          error: "Aufsicht nicht gefunden oder gehört nicht zu dieser Behörde",
        };
      }

      // Compute current compliance snapshot — same algorithm as the
      // /api/pharos/operators endpoint so the AI sees the same numbers
      // the dashboard shows.
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: oversight.operatorOrgId },
        select: { userId: true },
      });
      const userIds = members.map((m) => m.userId);

      const [openIncidents, overdueDeadlines] = await Promise.all([
        userIds.length === 0
          ? 0
          : prisma.incident.count({
              where: {
                supervision: { userId: { in: userIds } },
                status: { in: ["detected", "investigating", "contained"] },
              },
            }),
        userIds.length === 0
          ? 0
          : prisma.deadline.count({
              where: {
                userId: { in: userIds },
                dueDate: { lt: new Date() },
                completedAt: null,
                status: { notIn: ["COMPLETED", "CANCELLED"] },
              },
            }),
      ]);

      const score = Math.max(
        0,
        100 - openIncidents * 10 - overdueDeadlines * 5,
      );
      const tier = score >= 90 ? "good" : score >= 70 ? "drift" : "alert";

      const mdf = (oversight.mandatoryDisclosure as ScopeItem[]) ?? [];
      const vdf = (oversight.voluntaryDisclosure as ScopeItem[]) ?? [];

      return {
        ok: true,
        data: {
          oversight: {
            id: oversight.id,
            title: oversight.oversightTitle,
            reference: oversight.oversightReference,
            legalReference: oversight.legalReference,
            status: oversight.status,
            initiatedAt: oversight.initiatedAt,
            acceptedAt: oversight.acceptedAt,
            effectiveUntil: oversight.effectiveUntil,
          },
          operator: oversight.operatorOrg,
          compliance: {
            score,
            tier,
            openIncidents,
            overdueDeadlines,
          },
          scope: {
            mdfCategories: mdf.map((s: ScopeItem) => ({
              category: s.category as ScopeCategory,
              permissions: s.permissions,
            })),
            vdfCategories: vdf.map((s: ScopeItem) => ({
              category: s.category as ScopeCategory,
              permissions: s.permissions,
            })),
          },
        },
      };
    }

    if (name === "summarize_audit_chain") {
      const oversightId = String(input.oversightId ?? "");
      const limit = Math.min(50, Math.max(1, Number(input.limit ?? 20)));
      if (!oversightId) {
        return { ok: false, error: "oversightId required" };
      }
      const oversight = await loadScopedOversight(
        oversightId,
        ctx.authorityProfileId,
      );
      if (!oversight) {
        return {
          ok: false,
          error: "Aufsicht nicht gefunden oder gehört nicht zu dieser Behörde",
        };
      }

      const entries = await prisma.oversightAccessLog.findMany({
        where: { oversightId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          action: true,
          actorOrgId: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
          entryHash: true,
          previousHash: true,
        },
      });

      return {
        ok: true,
        data: {
          oversight: {
            id: oversight.id,
            title: oversight.oversightTitle,
            handshakeHash: oversight.handshakeHash,
          },
          entryCount: entries.length,
          entries: entries.map((e) => ({
            id: e.id,
            action: e.action,
            actorOrgId: e.actorOrgId,
            resourceType: e.resourceType,
            resourceId: e.resourceId,
            createdAt: e.createdAt,
            // Truncate hashes for token efficiency — the Astra UI can
            // show the full hash if a user clicks a specific entry.
            entryHashShort: e.entryHash.slice(0, 16),
            previousHashShort: e.previousHash
              ? e.previousHash.slice(0, 16)
              : "(root)",
          })),
        },
      };
    }

    return { ok: false, error: `Unknown tool: ${name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Tool execution failed: ${msg}` };
  }
}
