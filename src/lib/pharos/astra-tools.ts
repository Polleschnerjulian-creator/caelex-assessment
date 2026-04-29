import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import {
  type Citation,
  type ToolEnvelope,
  auditEntryCitation,
  computationCitation,
  dataRowCitation,
} from "./citation";
import { searchNormAnchors, normHitToCitation } from "./norm-anchor";
import { noisifyAggregate, getBudgetStatus } from "./differential-privacy";

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
  {
    name: "cross_authority_aggregate",
    description:
      "Differential-Privacy-geschützte Sektor-Aggregate über ALLE EU-Operatoren (nicht nur die der callenden Behörde). Liefert noisy-Counts mit Laplace-Mechanismus, ε=1.0 default. Kein einzelner Operator ist aus dem Output rekonstruierbar — selbst wenn alle Behörden ihre Outputs zusammentragen würden. Verbraucht DP-Budget (10.0 ε pro Tag pro Behörde).",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: [
            "operators-with-open-incidents",
            "operators-with-overdue-deadlines",
            "operators-in-alert-tier",
            "operators-in-drift-tier",
          ],
          description:
            "Welche Sektor-Metrik soll DP-geschützt aggregiert werden?",
        },
        epsilon: {
          type: "number",
          minimum: 0.1,
          maximum: 5.0,
          description:
            "Privacy-Budget-Verbrauch (default 1.0). Niedriger = privater aber rauschiger.",
        },
      },
      required: ["metric"],
    },
  },
  {
    name: "cite_norm",
    description:
      "Volltext-Suche im deterministischen NormAnchor-Index für regulatorische Citations. Postgres BM25 — kein Embedding-API-Call. Gibt Top-K Norm-Anchors mit Relevance-Score zurück; jeder Hit wird automatisch zu einer NORM-Citation transformiert die du in deiner Antwort referenzieren MUSST. Wenn keine Norm den Threshold erreicht, gib eine Abstention aus.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Stichworte aus dem User-Anliegen, z.B. 'authorisation space activity'. NICHT die Frage selbst, sondern die juristisch relevanten Begriffe.",
          minLength: 3,
          maxLength: 500,
        },
        jurisdiction: {
          type: "string",
          enum: [
            "EU",
            "DE",
            "FR",
            "UK",
            "IT",
            "ES",
            "LU",
            "NL",
            "PL",
            "AT",
            "BE",
            "SE",
            "NATO",
            "INT",
          ],
          description: "Optional: Beschränkung auf eine Jurisdiktion.",
        },
        instrument: {
          type: "string",
          description:
            "Optional: Instrument-Code, z.B. 'EU_SPACE_ACT', 'NIS2', 'BWRG'. Uppercase, underscore-separated.",
        },
        topK: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Anzahl Top-Hits (default 5).",
        },
      },
      required: ["query"],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────

interface ToolContext {
  authorityProfileId: string;
}

/** Compliance-Score-Engine versions. Bumping this string ALWAYS produces
 *  a new computation citation hash — so a behördlicher Bescheid kann an
 *  einer konkreten Engine-Version festgemacht werden. */
const COMPLIANCE_SCORE_ENGINE_VERSION = "v1.0";

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
): Promise<ToolEnvelope> {
  try {
    if (name === "query_operator_compliance") {
      const oversightId = String(input.oversightId ?? "");
      if (!oversightId) {
        return {
          ok: false,
          citations: [],
          error: "oversightId required",
        };
      }
      const oversight = await loadScopedOversight(
        oversightId,
        ctx.authorityProfileId,
      );
      if (!oversight) {
        return {
          ok: false,
          citations: [],
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

      // Citation-Provenance für jede einzelne Aussage: das LLM kann nur
      // mit diesen IDs antworten, alles andere wird als Halluzination
      // verworfen.
      const citations: Citation[] = [
        dataRowCitation({
          table: "OversightRelationship",
          id: oversight.id,
          span: "status,handshakeHash,mandatoryDisclosure,voluntaryDisclosure",
          content: {
            handshakeHash: oversight.handshakeHash,
            id: oversight.id,
            legalReference: oversight.legalReference,
            mandatoryDisclosure: oversight.mandatoryDisclosure,
            status: oversight.status,
            voluntaryDisclosure: oversight.voluntaryDisclosure,
          },
        }),
        dataRowCitation({
          table: "Organization",
          id: oversight.operatorOrgId,
          span: "id,name,slug",
          content: oversight.operatorOrg,
        }),
        computationCitation({
          name: "operator-compliance-score",
          version: COMPLIANCE_SCORE_ENGINE_VERSION,
          inputs: {
            formula: "max(0, 100 - openIncidents*10 - overdueDeadlines*5)",
            openIncidents,
            overdueDeadlines,
            score,
            thresholds: { good: 90, drift: 70 },
          },
        }),
      ];

      return {
        ok: true,
        citations,
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
            // Embed citation-IDs ALONGSIDE the data, so the model
            // sees which fact is backed by which citation.
            _citation: citations[0].id,
          },
          operator: {
            ...oversight.operatorOrg,
            _citation: citations[1].id,
          },
          compliance: {
            score,
            tier,
            openIncidents,
            overdueDeadlines,
            _citation: citations[2].id,
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
            _citation: citations[0].id,
          },
        },
      };
    }

    if (name === "summarize_audit_chain") {
      const oversightId = String(input.oversightId ?? "");
      const limit = Math.min(50, Math.max(1, Number(input.limit ?? 20)));
      if (!oversightId) {
        return { ok: false, citations: [], error: "oversightId required" };
      }
      const oversight = await loadScopedOversight(
        oversightId,
        ctx.authorityProfileId,
      );
      if (!oversight) {
        return {
          ok: false,
          citations: [],
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

      // Abstention: Hash-Chain ist leer → wir können keine Aussage über
      // Audit-Aktivität machen. Strukturierte Verweigerung statt
      // halluzinierter "es gab keine Zugriffe"-Antwort.
      if (entries.length === 0) {
        return {
          ok: true,
          abstain: true,
          abstainReason:
            "Keine Audit-Log-Einträge für diese Aufsicht — Hash-Chain ist leer. Eine substanzielle Aussage zu Behörden-Zugriffsmustern ist nicht möglich.",
          citations: [
            dataRowCitation({
              table: "OversightRelationship",
              id: oversight.id,
              span: "handshakeHash",
              content: { handshakeHash: oversight.handshakeHash },
            }),
          ],
          data: {
            oversight: {
              id: oversight.id,
              title: oversight.oversightTitle,
              handshakeHash: oversight.handshakeHash,
            },
            entryCount: 0,
          },
        };
      }

      // Eine Citation pro Audit-Eintrag — so kann das Modell für JEDE
      // konkrete Aussage ("am 14:23 hat Eva M. Doc X gelesen") die
      // korrespondierende Hash-Chain-Position referenzieren.
      const citations: Citation[] = entries.map((e) =>
        auditEntryCitation({
          oversightId,
          entryId: e.id,
          entryHash: e.entryHash,
        }),
      );

      return {
        ok: true,
        citations,
        data: {
          oversight: {
            id: oversight.id,
            title: oversight.oversightTitle,
            handshakeHash: oversight.handshakeHash,
          },
          entryCount: entries.length,
          entries: entries.map((e, idx) => ({
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
            _citation: citations[idx].id,
          })),
        },
      };
    }

    if (name === "cross_authority_aggregate") {
      const metric = String(input.metric ?? "");
      const epsilon = typeof input.epsilon === "number" ? input.epsilon : 1.0;

      // Hole REAL counts aus DB. Für Phase 1 simple Aggregate über
      // alle aktiven OversightRelationships mit ACTIVE Status. In
      // Phase 2 sollte das gegen materialisierte Sicht laufen, die
      // täglich vom Cron refresht wird.
      let realCount = 0;
      try {
        const allActiveOversights = await prisma.oversightRelationship.findMany(
          {
            where: { status: "ACTIVE" },
            select: { operatorOrgId: true },
          },
        );
        const operatorOrgIds = Array.from(
          new Set(allActiveOversights.map((o) => o.operatorOrgId)),
        );
        if (operatorOrgIds.length === 0) {
          return {
            ok: true,
            abstain: true,
            abstainReason:
              "Keine aktiven Aufsichten im EU-weiten Pool — DP-Aggregat nicht möglich (würde die Existenz / Nicht-Existenz einzelner Operatoren leaken).",
            citations: [],
            data: { metric, epsilon },
          };
        }
        const memberLookup = await prisma.organizationMember.findMany({
          where: { organizationId: { in: operatorOrgIds } },
          select: { organizationId: true, userId: true },
        });
        const orgToUsers = new Map<string, string[]>();
        for (const m of memberLookup) {
          const arr = orgToUsers.get(m.organizationId) ?? [];
          arr.push(m.userId);
          orgToUsers.set(m.organizationId, arr);
        }
        const countOperators = async (
          predicate: (orgId: string) => Promise<boolean>,
        ): Promise<number> => {
          let n = 0;
          for (const orgId of operatorOrgIds) {
            if (await predicate(orgId)) n++;
          }
          return n;
        };

        if (metric === "operators-with-open-incidents") {
          realCount = await countOperators(async (orgId) => {
            const userIds = orgToUsers.get(orgId) ?? [];
            if (userIds.length === 0) return false;
            const c = await prisma.incident.count({
              where: {
                supervision: { userId: { in: userIds } },
                status: { in: ["detected", "investigating", "contained"] },
              },
            });
            return c > 0;
          });
        } else if (metric === "operators-with-overdue-deadlines") {
          realCount = await countOperators(async (orgId) => {
            const userIds = orgToUsers.get(orgId) ?? [];
            if (userIds.length === 0) return false;
            const c = await prisma.deadline.count({
              where: {
                userId: { in: userIds },
                dueDate: { lt: new Date() },
                completedAt: null,
                status: { notIn: ["COMPLETED", "CANCELLED"] },
              },
            });
            return c > 0;
          });
        } else if (
          metric === "operators-in-alert-tier" ||
          metric === "operators-in-drift-tier"
        ) {
          realCount = await countOperators(async (orgId) => {
            const userIds = orgToUsers.get(orgId) ?? [];
            if (userIds.length === 0) return false;
            const [openIncidents, overdueDeadlines] = await Promise.all([
              prisma.incident.count({
                where: {
                  supervision: { userId: { in: userIds } },
                  status: { in: ["detected", "investigating", "contained"] },
                },
              }),
              prisma.deadline.count({
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
            if (metric === "operators-in-alert-tier") return score < 70;
            return score >= 70 && score < 90;
          });
        } else {
          return {
            ok: false,
            citations: [],
            error: `Unbekannte Metrik: ${metric}`,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          citations: [],
          error: `DP-Aggregat-Berechnung fehlgeschlagen: ${msg}`,
        };
      }

      const aggregate = noisifyAggregate({
        authorityProfileId: ctx.authorityProfileId,
        metric: metric as Parameters<typeof noisifyAggregate>[0]["metric"],
        epsilon,
        realCount,
      });

      if (!aggregate.ok) {
        return {
          ok: true,
          abstain: true,
          abstainReason: aggregate.reason ?? "DP-Budget erschöpft",
          citations: [],
          data: {
            metric,
            epsilon,
            budget: getBudgetStatus(ctx.authorityProfileId),
          },
        };
      }

      const citations: Citation[] = [
        computationCitation({
          name: `dp-aggregate-${metric}`,
          version: "v1.0",
          inputs: {
            mechanism: aggregate.mechanism,
            epsilon: aggregate.epsilon,
            sensitivity: 1,
            algorithm: "Laplace",
          },
        }),
      ];

      return {
        ok: true,
        citations,
        data: {
          metric,
          released: {
            count: aggregate.releasedCount,
            confidence95: [aggregate.lowerBound95, aggregate.upperBound95],
            mechanism: aggregate.mechanism,
            epsilon: aggregate.epsilon,
            releasedAt: aggregate.releasedAt,
            _citation: citations[0].id,
          },
          budget: {
            remainingToday: aggregate.remainingBudget,
          },
          privacyGuarantee:
            "ε-Differential-Privacy mit Laplace-Mechanismus. Eine Veränderung der Daten eines beliebigen einzelnen Operators ändert die Output-Verteilung um maximal exp(ε).",
        },
      };
    }

    if (name === "cite_norm") {
      const query = String(input.query ?? "").trim();
      if (query.length < 3) {
        return {
          ok: false,
          citations: [],
          error: "query muss mindestens 3 Zeichen sein",
        };
      }
      const jurisdiction =
        typeof input.jurisdiction === "string" ? input.jurisdiction : undefined;
      const instrument =
        typeof input.instrument === "string" ? input.instrument : undefined;
      const topK = typeof input.topK === "number" ? input.topK : 5;

      const hits = await searchNormAnchors(query, {
        jurisdiction,
        instrument,
        topK,
      });

      // Strukturierte Abstention wenn keine Norm den Schwellwert
      // erreicht — verhindert dass das Modell auf "Allgemeinwissen"
      // ausweicht.
      if (hits.length === 0) {
        return {
          ok: true,
          abstain: true,
          abstainReason: `Keine Norm-Anchor erreicht den Relevance-Threshold (>= 0.05) für Query "${query}"${
            jurisdiction ? ` (Jurisdiktion: ${jurisdiction})` : ""
          }. Bitte präzisiere die Suchbegriffe oder erweitere die Jurisdiktion.`,
          citations: [],
          data: { query, jurisdiction, instrument, hits: [] },
        };
      }

      const citations: Citation[] = hits.map(normHitToCitation);

      return {
        ok: true,
        citations,
        data: {
          query,
          jurisdiction,
          instrument,
          hitCount: hits.length,
          hits: hits.map((h, idx) => ({
            id: h.id,
            jurisdiction: h.jurisdiction,
            instrument: h.instrument,
            unit: h.unit,
            number: h.number,
            title: h.title,
            textSnippet: h.textSnippet,
            relevance: Number(h.relevance.toFixed(4)),
            sourceUrl: h.sourceUrl,
            _citation: citations[idx].id,
          })),
        },
      };
    }

    return { ok: false, citations: [], error: `Unknown tool: ${name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      citations: [],
      error: `Tool execution failed: ${msg}`,
    };
  }
}
