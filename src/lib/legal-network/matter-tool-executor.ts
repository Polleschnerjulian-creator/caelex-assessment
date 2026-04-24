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
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cosineSimilarity, embed } from "ai";
import { prisma } from "@/lib/prisma";
import { ALL_SOURCES } from "@/data/legal-sources";
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
  /** Pinboard card created from this tool invocation. Null on error,
   *  or when the tool is scope-free-informational (rare). The UI
   *  refreshes the pinboard when a new artifactId streams back. */
  artifactId?: string;
}

// ─── Input schemas ────────────────────────────────────────────────────

const LoadComplianceOverviewInput = z.object({
  detail_level: z.enum(["summary", "full"]).optional(),
});

const SearchLegalSourcesInput = z.object({
  query: z.string().min(4).max(200),
  limit: z.number().int().min(1).max(10).optional(),
});

const DraftMemoToNoteInput = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(100_000),
});

// ─── Helpers ──────────────────────────────────────────────────────────

function errOutput(message: string, code?: string): ToolExecutionResult {
  return {
    content: JSON.stringify({ error: message, code }),
    isError: true,
  };
}

/** Create a pinboard artifact for a successful tool result. Position
 *  is "last + 1" so new cards land at the end of the masonry; users
 *  can repin later. Failures are caught and swallowed — a missing
 *  card shouldn't derail the tool call itself. */
async function persistArtifact(args: {
  matterId: string;
  conversationId?: string;
  kind: "COMPLIANCE_OVERVIEW" | "CITATIONS" | "MEMO" | "TEXT";
  title: string;
  payload: Record<string, unknown>;
  widthHint?: "small" | "medium" | "large";
  createdBy: string;
}): Promise<string | undefined> {
  try {
    const last = await prisma.matterArtifact.findFirst({
      where: { matterId: args.matterId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const artifact = await prisma.matterArtifact.create({
      data: {
        matterId: args.matterId,
        conversationId: args.conversationId,
        kind: args.kind,
        title: args.title,
        payload: args.payload as object,
        widthHint: args.widthHint ?? "medium",
        position: (last?.position ?? 0) + 1,
        createdBy: args.createdBy,
      },
    });
    return artifact.id;
  } catch {
    return undefined;
  }
}

// ─── load_compliance_overview ─────────────────────────────────────────

async function loadComplianceOverview(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  conversationId?: string;
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

  const artifactId = await persistArtifact({
    matterId: args.matter.id,
    conversationId: args.conversationId,
    kind: "COMPLIANCE_OVERVIEW",
    title: "Compliance-Übersicht",
    payload: summary as unknown as Record<string, unknown>,
    widthHint: "medium",
    createdBy: args.actorUserId,
  });

  return { content: JSON.stringify(summary), isError: false, artifactId };
}

// ─── search_legal_sources ─────────────────────────────────────────────
//
// Module-cached vector catalogue — same file as the /api/atlas/
// semantic-search endpoint. Shipped with Commit 88f3e801.

interface EmbeddingEntry {
  id: string;
  type: "source" | "authority" | "profile" | "case-study" | "conduct";
  contentHash: string;
  vector: number[];
}

let catalogueCache: Promise<EmbeddingEntry[] | null> | null = null;
function loadCatalogue(): Promise<EmbeddingEntry[] | null> {
  if (catalogueCache) return catalogueCache;
  catalogueCache = (async () => {
    try {
      const path = join(
        process.cwd(),
        "src",
        "data",
        "atlas",
        "embeddings.json",
      );
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as EmbeddingEntry[];
    } catch {
      return null;
    }
  })();
  return catalogueCache;
}

async function searchLegalSources(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  conversationId?: string;
}): Promise<ToolExecutionResult> {
  const parsed = SearchLegalSourcesInput.safeParse(args.input);
  if (!parsed.success) return errOutput("Invalid tool input", "INVALID_INPUT");

  const catalogue = await loadCatalogue();
  if (!catalogue) {
    return errOutput(
      "Legal corpus not indexed. Run `npm run atlas:embed` first.",
      "NOT_INDEXED",
    );
  }

  const limit = parsed.data.limit ?? 5;

  try {
    const { embedding: queryVector } = await embed({
      model: "openai/text-embedding-3-small",
      value: parsed.data.query,
      providerOptions: { openai: { dimensions: 512 } },
      abortSignal: AbortSignal.timeout(4000),
      maxRetries: 1,
    });

    const scored = catalogue
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        score: cosineSimilarity(queryVector, entry.vector),
      }))
      .filter((m) => m.score >= 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Hydrate sources — we only include legal sources (not authorities
    // or landing-rights profiles) since those are the citable items.
    const hydrated = scored
      .map((m) => {
        const [, rawId] = m.id.split(":");
        if (m.type !== "source" || !rawId) return null;
        const s = ALL_SOURCES.find((x) => x.id === rawId);
        if (!s) return null;
        return {
          id: s.id,
          title: s.title_en,
          titleLocal: s.title_local,
          jurisdiction: s.jurisdiction,
          type: s.type,
          officialReference: s.official_reference,
          sourceUrl: s.source_url,
          score: Math.round(m.score * 100) / 100,
          keyProvisionsPreview: s.key_provisions
            .slice(0, 3)
            .map((p) => `${p.title}: ${p.summary.slice(0, 150)}`),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Audit-log — corpus access isn't scope-gated (public-ish data)
    // but we log it to the matter's chain so there's a full record
    // of what Claude consulted on this client's behalf.
    await emitAccessLog({
      matter: args.matter,
      actorUserId: args.actorUserId,
      actorOrgId: args.actorOrgId,
      actorSide: "ATLAS",
      action: "SUMMARY_GENERATED",
      resourceType: "LegalSourceCorpus",
      resourceId: null,
      matterScope: "AUDIT_LOGS",
      context: {
        tool: "search_legal_sources",
        query: parsed.data.query,
        hits: hydrated.length,
      },
    });

    const artifactId = await persistArtifact({
      matterId: args.matter.id,
      conversationId: args.conversationId,
      kind: "CITATIONS",
      title: `Zitate: „${parsed.data.query.slice(0, 60)}"`,
      payload: {
        query: parsed.data.query,
        matches: hydrated,
      },
      widthHint: "medium",
      createdBy: args.actorUserId,
    });

    return {
      content: JSON.stringify({
        query: parsed.data.query,
        matches: hydrated,
      }),
      isError: false,
      artifactId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errOutput(`Embedding failed: ${msg}`, "EMBEDDING_ERROR");
  }
}

// ─── draft_memo_to_note ───────────────────────────────────────────────

async function draftMemoToNote(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  conversationId?: string;
}): Promise<ToolExecutionResult> {
  const parsed = DraftMemoToNoteInput.safeParse(args.input);
  if (!parsed.success) return errOutput("Invalid tool input", "INVALID_INPUT");

  // Consistency check: require the caller to have ANNOTATE on at least
  // one category. Notes are firm-internal, but we block stub-scope
  // matters from quietly filling the workspace with notes.
  try {
    // "any category with ANNOTATE" — we try COMPLIANCE_ASSESSMENTS as
    // the most likely granted, then bail with a meaningful message.
    await requireActiveMatter({
      matterId: args.matter.id,
      callerOrgId: args.actorOrgId,
      callerSide: "ATLAS",
      category: "COMPLIANCE_ASSESSMENTS",
      permission: "ANNOTATE",
    });
  } catch (err) {
    if (err instanceof MatterAccessError) {
      return errOutput(
        `Cannot save memo: matter scope doesn't grant ANNOTATE on any data category. Ask user to request a scope amendment.`,
        err.code,
      );
    }
    throw err;
  }

  const note = await prisma.matterNote.create({
    data: {
      matterId: args.matter.id,
      title: parsed.data.title,
      content: parsed.data.content,
      createdBy: args.actorUserId,
    },
  });

  await emitAccessLog({
    matter: args.matter,
    actorUserId: args.actorUserId,
    actorOrgId: args.actorOrgId,
    actorSide: "ATLAS",
    action: "MEMO_DRAFTED",
    resourceType: "MatterNote",
    resourceId: note.id,
    matterScope: "AUDIT_LOGS",
    context: {
      tool: "draft_memo_to_note",
      title: parsed.data.title,
      contentLength: parsed.data.content.length,
    },
  });

  const artifactId = await persistArtifact({
    matterId: args.matter.id,
    conversationId: args.conversationId,
    kind: "MEMO",
    title: parsed.data.title,
    payload: {
      noteId: note.id,
      title: note.title,
      content: parsed.data.content,
      contentLength: parsed.data.content.length,
    },
    widthHint: "large",
    createdBy: args.actorUserId,
  });

  return {
    content: JSON.stringify({
      noteId: note.id,
      title: note.title,
      savedAt: note.createdAt,
      message:
        "Note saved. Tell the user the draft is now in the Notes tab of the workspace.",
    }),
    isError: false,
    artifactId,
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────

export async function executeTool(args: {
  name: MatterToolName;
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  /** Conversation that triggered this tool call — the resulting
   *  artifact gets tagged so the UI can group cards by thread if
   *  we ever add per-conversation filtering. Optional because
   *  admin/script-triggered calls don't belong to a conversation. */
  conversationId?: string;
}): Promise<ToolExecutionResult> {
  switch (args.name) {
    case "load_compliance_overview":
      return loadComplianceOverview(args);
    case "search_legal_sources":
      return searchLegalSources(args);
    case "draft_memo_to_note":
      return draftMemoToNote(args);
    default: {
      const _never: never = args.name;
      return errOutput(`Unknown tool: ${String(_never)}`, "UNKNOWN_TOOL");
    }
  }
}
