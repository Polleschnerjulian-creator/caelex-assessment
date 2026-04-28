import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import type {
  LegalMatter,
  DocumentCategory,
  DocumentStatus,
} from "@prisma/client";
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

const CompareJurisdictionsInput = z.object({
  jurisdictions: z.array(z.string().min(2).max(3)).min(2).max(5),
  topic: z.string().max(100).optional(),
});

const ListMatterDocumentsInput = z.object({
  query: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  status: z.string().max(30).optional(),
  limit: z.number().int().min(1).max(25).optional(),
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
  kind:
    | "COMPLIANCE_OVERVIEW"
    | "CITATIONS"
    | "MEMO"
    | "JURISDICTION_COMPARE"
    | "DOCUMENT_REFERENCE"
    | "TEXT";
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

// ─── list_matter_documents ────────────────────────────────────────────
//
// Lists Documents from the client's vault. Unlike compare_jurisdictions
// (static public corpus) this IS client data — gated through
// requireActiveMatter on DOCUMENTS / READ. The audit log uses
// matterScope: DOCUMENTS so the operator can see exactly when their
// vault was queried by Atlas.

interface DocumentReferencePayload {
  query: string | null;
  category: string | null;
  status: string | null;
  totalMatches: number;
  documents: Array<{
    id: string;
    name: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    category: string;
    subcategory: string | null;
    status: string;
    version: number;
    issueDate: string | null;
    expiryDate: string | null;
    isExpired: boolean;
    moduleType: string | null;
    regulatoryRef: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

const VALID_DOCUMENT_CATEGORIES = new Set<DocumentCategory>([
  "LICENSE",
  "PERMIT",
  "AUTHORIZATION",
  "CERTIFICATE",
  "ISO_CERTIFICATE",
  "SECURITY_CERT",
  "INSURANCE_POLICY",
  "INSURANCE_CERT",
  "COMPLIANCE_REPORT",
  "AUDIT_REPORT",
  "INCIDENT_REPORT",
  "ANNUAL_REPORT",
  "TECHNICAL_SPEC",
  "DESIGN_DOC",
  "TEST_REPORT",
  "SAFETY_ANALYSIS",
  "CONTRACT",
  "NDA",
  "SLA",
  "REGULATORY_FILING",
  "CORRESPONDENCE",
  "NOTIFICATION",
  "POLICY",
  "PROCEDURE",
  "TRAINING",
  "OTHER",
]);

const VALID_DOCUMENT_STATUSES = new Set<DocumentStatus>([
  "DRAFT",
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "EXPIRED",
  "SUPERSEDED",
]);

async function listMatterDocuments(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  conversationId?: string;
}): Promise<ToolExecutionResult> {
  const parsed = ListMatterDocumentsInput.safeParse(args.input);
  if (!parsed.success) return errOutput("Invalid tool input", "INVALID_INPUT");

  // Scope gate — DOCUMENTS / READ. Same pattern as load_compliance_overview;
  // documents ARE client data, gate must be enforced.
  try {
    await requireActiveMatter({
      matterId: args.matter.id,
      callerOrgId: args.actorOrgId,
      callerSide: "ATLAS",
      category: "DOCUMENTS",
      permission: "READ",
    });
  } catch (err) {
    if (err instanceof MatterAccessError) {
      return errOutput(
        `Access denied: ${err.message}. Ask the user to request a scope amendment on DOCUMENTS.`,
        err.code,
      );
    }
    throw err;
  }

  // Validate enum filters BEFORE hitting Prisma — Prisma would throw
  // a less-helpful error on an unknown enum value.
  const categoryRaw = parsed.data.category;
  const statusRaw = parsed.data.status;
  if (
    categoryRaw &&
    !VALID_DOCUMENT_CATEGORIES.has(categoryRaw as DocumentCategory)
  ) {
    return errOutput(
      `Unknown category: ${categoryRaw}. Use one of the documented enum values.`,
      "INVALID_CATEGORY",
    );
  }
  if (statusRaw && !VALID_DOCUMENT_STATUSES.has(statusRaw as DocumentStatus)) {
    return errOutput(
      `Unknown status: ${statusRaw}. Use one of: DRAFT, PENDING_REVIEW, UNDER_REVIEW, PENDING_APPROVAL, APPROVED, ACTIVE, EXPIRED, SUPERSEDED.`,
      "INVALID_STATUS",
    );
  }

  const limit = parsed.data.limit ?? 10;
  const query = parsed.data.query?.trim() ?? "";

  const documents = await prisma.document.findMany({
    where: {
      organizationId: args.matter.clientOrgId,
      isLatest: true,
      ...(categoryRaw ? { category: categoryRaw as DocumentCategory } : {}),
      ...(statusRaw ? { status: statusRaw as DocumentStatus } : {}),
      ...(query.length > 0
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { fileName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      category: true,
      subcategory: true,
      status: true,
      version: true,
      issueDate: true,
      expiryDate: true,
      isExpired: true,
      moduleType: true,
      regulatoryRef: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const payload: DocumentReferencePayload = {
    query: query.length > 0 ? query : null,
    category: categoryRaw ?? null,
    status: statusRaw ?? null,
    totalMatches: documents.length,
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      category: d.category,
      subcategory: d.subcategory,
      status: d.status,
      version: d.version,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      isExpired: d.isExpired,
      moduleType: d.moduleType,
      regulatoryRef: d.regulatoryRef,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };

  await emitAccessLog({
    matter: args.matter,
    actorUserId: args.actorUserId,
    actorOrgId: args.actorOrgId,
    actorSide: "ATLAS",
    action: "READ_DOCUMENT",
    resourceType: "DocumentList",
    resourceId: null,
    matterScope: "DOCUMENTS",
    context: {
      tool: "list_matter_documents",
      query: parsed.data.query ?? null,
      category: categoryRaw ?? null,
      status: statusRaw ?? null,
      hits: documents.length,
    },
  });

  // Title humanises the filter for the card header
  const titleParts: string[] = [];
  if (categoryRaw)
    titleParts.push(categoryRaw.replace(/_/g, " ").toLowerCase());
  if (query) titleParts.push(`„${query}"`);
  const title =
    titleParts.length > 0
      ? `Dokumente: ${titleParts.join(" · ")}`
      : `Dokumente — ${documents.length} Treffer`;

  const artifactId = await persistArtifact({
    matterId: args.matter.id,
    conversationId: args.conversationId,
    kind: "DOCUMENT_REFERENCE",
    title,
    payload: payload as unknown as Record<string, unknown>,
    widthHint: "medium",
    createdBy: args.actorUserId,
  });

  return {
    content: JSON.stringify(payload),
    isError: false,
    artifactId,
  };
}

// ─── compare_jurisdictions ────────────────────────────────────────────
//
// Pulls 2-5 jurisdictions from the static JURISDICTION_DATA Map and
// composes a comparison payload. Like search_legal_sources, this is
// scope-free (the corpus is public knowledge) but logs to AUDIT_LOGS
// so the operator sees what Atlas consulted on their behalf.

interface JurisdictionComparePayload {
  /** Optional focus area the user supplied. */
  topic: string | null;
  /** Country codes that were resolved successfully. */
  jurisdictions: Array<{
    code: string;
    name: string;
    flag: string;
    legislation: {
      name: string;
      yearEnacted: number;
      status: string;
      officialUrl: string | null;
    };
    licensingAuthority: {
      name: string;
      website: string;
    };
    insurance: {
      mandatory: boolean;
      minimumCoverage: string | null;
      liabilityRegime: string;
      liabilityCap: string | null;
    };
    debris: {
      deorbitRequired: boolean;
      deorbitTimeline: string | null;
      passivationRequired: boolean;
      collisionAvoidance: boolean;
    };
    timeline: {
      typicalProcessingWeeks: { min: number; max: number };
      applicationFee: string | null;
      annualFee: string | null;
    };
    euSpaceAct: {
      relationship: string;
      description: string;
    };
    notes: string[];
    lastUpdated: string;
  }>;
  /** Country codes that were requested but not found in the dataset. */
  unknown: string[];
}

async function compareJurisdictions(args: {
  input: unknown;
  matter: LegalMatter;
  actorUserId: string;
  actorOrgId: string;
  conversationId?: string;
}): Promise<ToolExecutionResult> {
  const parsed = CompareJurisdictionsInput.safeParse(args.input);
  if (!parsed.success) return errOutput("Invalid tool input", "INVALID_INPUT");

  const requested = parsed.data.jurisdictions.map((c) =>
    c.toUpperCase(),
  ) as SpaceLawCountryCode[];

  // De-duplicate while preserving order so Claude's output matches
  // what the user asked for.
  const seen = new Set<string>();
  const unique: SpaceLawCountryCode[] = [];
  for (const c of requested) {
    if (!seen.has(c)) {
      seen.add(c);
      unique.push(c);
    }
  }

  const found: JurisdictionComparePayload["jurisdictions"] = [];
  const unknown: string[] = [];

  for (const code of unique) {
    const j = JURISDICTION_DATA.get(code);
    if (!j) {
      unknown.push(code);
      continue;
    }
    found.push({
      code: j.countryCode,
      name: j.countryName,
      flag: j.flagEmoji,
      legislation: {
        name: j.legislation.name,
        yearEnacted: j.legislation.yearEnacted,
        status: j.legislation.status,
        officialUrl: j.legislation.officialUrl ?? null,
      },
      licensingAuthority: {
        name: j.licensingAuthority.name,
        website: j.licensingAuthority.website,
      },
      insurance: {
        mandatory: j.insuranceLiability.mandatoryInsurance,
        minimumCoverage: j.insuranceLiability.minimumCoverage ?? null,
        liabilityRegime: j.insuranceLiability.liabilityRegime,
        liabilityCap: j.insuranceLiability.liabilityCap ?? null,
      },
      debris: {
        deorbitRequired: j.debrisMitigation.deorbitRequirement,
        deorbitTimeline: j.debrisMitigation.deorbitTimeline ?? null,
        passivationRequired: j.debrisMitigation.passivationRequired,
        collisionAvoidance: j.debrisMitigation.collisionAvoidance,
      },
      timeline: {
        typicalProcessingWeeks: j.timeline.typicalProcessingWeeks,
        applicationFee: j.timeline.applicationFee ?? null,
        annualFee: j.timeline.annualFee ?? null,
      },
      euSpaceAct: {
        relationship: j.euSpaceActCrossRef.relationship,
        description: j.euSpaceActCrossRef.description,
      },
      notes: j.notes ?? [],
      lastUpdated: j.lastUpdated,
    });
  }

  if (found.length < 2) {
    return errOutput(
      `Need at least 2 valid jurisdictions; resolved ${found.length}. Unknown codes: ${unknown.join(", ")}`,
      "INSUFFICIENT_JURISDICTIONS",
    );
  }

  const payload: JurisdictionComparePayload = {
    topic: parsed.data.topic ?? null,
    jurisdictions: found,
    unknown,
  };

  // Audit-log the comparison — same pattern as search_legal_sources,
  // since both are static-corpus reads. Operator can see in the log
  // exactly which jurisdictions Atlas looked at for them.
  await emitAccessLog({
    matter: args.matter,
    actorUserId: args.actorUserId,
    actorOrgId: args.actorOrgId,
    actorSide: "ATLAS",
    action: "SUMMARY_GENERATED",
    resourceType: "JurisdictionComparison",
    resourceId: null,
    matterScope: "AUDIT_LOGS",
    context: {
      tool: "compare_jurisdictions",
      jurisdictions: found.map((j) => j.code),
      topic: parsed.data.topic ?? null,
      unknown,
    },
  });

  // Title humanises the country codes for the card.
  const title = parsed.data.topic
    ? `${found.map((j) => j.code).join(" vs. ")} — ${parsed.data.topic}`
    : `${found.map((j) => j.code).join(" vs. ")}`;

  const artifactId = await persistArtifact({
    matterId: args.matter.id,
    conversationId: args.conversationId,
    kind: "JURISDICTION_COMPARE",
    title,
    payload: payload as unknown as Record<string, unknown>,
    widthHint: "large", // tables benefit from the full 2-col span
    createdBy: args.actorUserId,
  });

  return {
    content: JSON.stringify(payload),
    isError: false,
    artifactId,
  };
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
    case "list_matter_documents":
      return listMatterDocuments(args);
    case "compare_jurisdictions":
      return compareJurisdictions(args);
    case "draft_memo_to_note":
      return draftMemoToNote(args);
    default: {
      const _never: never = args.name;
      return errOutput(`Unknown tool: ${String(_never)}`, "UNKNOWN_TOOL");
    }
  }
}
