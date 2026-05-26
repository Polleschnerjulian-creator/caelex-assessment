import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Tool Metadata sidecar (T0.6 schema cleanup, 2026-05-26).
 *
 * The master plan's T0.6 wants a unified `ToolDefinition` shape with
 * `bundle`, `requiresApproval`, `expectedDurationMs`, and `costClass`
 * fields on every tool. Rather than rewrite all 48 Anthropic.Tool
 * entries across the 12 bundles (which would risk breaking the
 * Anthropic SDK's tool-schema validation), this module adds a
 * **parallel metadata map** keyed by tool-name.
 *
 * Consumers:
 *   - Audit log: enrich the `action` field with the bundle + cost-
 *     class for analytics dashboards.
 *   - UI: cost-class badge ("$" / "$$" / "$$$") next to each tool
 *     call in the chat trace; expected-duration progress bar; modal
 *     prompt before any `requiresApproval` tool.
 *   - Pipeline-runner approval-gates (T1.E.26): step-level gates
 *     can default to "approval required if any expected-tool has
 *     requiresApproval=true".
 *
 * The sidecar lives in its own file so the ATLAS_TOOLS array
 * (consumed by Anthropic) stays pure Anthropic.Tool shapes and the
 * SDK doesn't reject anything.
 *
 * Drift safety: `assertAllToolsHaveMetadata()` is exported for the
 * test suite to call at startup. It throws if a tool name appears
 * in ATLAS_TOOLS but not in TOOL_METADATA — forcing the metadata
 * map to stay in sync with the tool-definitions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** Bundle that owns the tool. Matches the *-tools.server.ts file
 *  name minus the suffix. Used by the audit log + UI to group
 *  tool-calls by source-of-truth. */
export type AtlasToolBundle =
  | "branding"
  | "mandate"
  | "templates"
  | "korpus"
  | "network"
  | "comparison"
  | "deadlines"
  | "drafting"
  | "compliance"
  | "validity"
  | "document"
  | "web"
  | "agent"; // delegate_subtasks lives in agent route, not a bundle

/** Cost hint for UI badging.
 *  - "low" → no LLM call (registry lookup, pure data, regex sweep)
 *  - "medium" → LLM call with short output (≤ 500 tokens, e.g. classify)
 *  - "high" → LLM call with long output (≥ 1500 tokens, e.g. draft_*) */
export type AtlasToolCostClass = "low" | "medium" | "high";

export interface AtlasToolMetadata {
  bundle: AtlasToolBundle;
  /** True iff invoking this tool should prompt the user for explicit
   *  approval (state-changing writes, data-room creation, external
   *  document generation). UI consumers use this to gate the call. */
  requiresApproval: boolean;
  /** Rough wall-clock estimate. Used for progress-bar hints; not a
   *  hard timeout. */
  expectedDurationMs: number;
  costClass: AtlasToolCostClass;
}

/**
 * Source-of-truth map. Every tool exposed by ATLAS_TOOLS MUST have
 * an entry here. The drift validator (assertAllToolsHaveMetadata)
 * runs in the unit-test suite to enforce this invariant.
 */
export const TOOL_METADATA: Record<string, AtlasToolMetadata> = {
  /* ── branding (2) ─────────────────────────────────────────────────── */
  get_org_branding: {
    bundle: "branding",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  set_org_branding: {
    bundle: "branding",
    requiresApproval: true, // mutates org-level branding
    expectedDurationMs: 300,
    costClass: "low",
  },

  /* ── mandate (2) ──────────────────────────────────────────────────── */
  find_or_open_matter: {
    bundle: "mandate",
    requiresApproval: false,
    expectedDurationMs: 400,
    costClass: "low",
  },
  search_mandate_vault: {
    bundle: "mandate",
    requiresApproval: false,
    expectedDurationMs: 800, // pgvector + embedding call
    costClass: "medium",
  },

  /* ── templates (4) ────────────────────────────────────────────────── */
  list_workspace_templates: {
    bundle: "templates",
    requiresApproval: false,
    expectedDurationMs: 100,
    costClass: "low",
  },
  list_document_templates: {
    bundle: "templates",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  save_document_template: {
    bundle: "templates",
    requiresApproval: true, // org-level write
    expectedDurationMs: 400,
    costClass: "low",
  },
  use_document_template: {
    bundle: "templates",
    requiresApproval: false,
    expectedDurationMs: 300,
    costClass: "low",
  },

  /* ── korpus (5) ───────────────────────────────────────────────────── */
  search_legal_sources: {
    bundle: "korpus",
    requiresApproval: false,
    expectedDurationMs: 600, // semantic-corpus + keyword merge
    costClass: "medium",
  },
  get_legal_source_by_id: {
    bundle: "korpus",
    requiresApproval: false,
    expectedDurationMs: 80,
    costClass: "low",
  },
  list_jurisdiction_authorities: {
    bundle: "korpus",
    requiresApproval: false,
    expectedDurationMs: 100,
    costClass: "low",
  },
  search_cases: {
    bundle: "korpus",
    requiresApproval: false,
    expectedDurationMs: 500,
    costClass: "medium",
  },
  get_case_by_id: {
    bundle: "korpus",
    requiresApproval: false,
    expectedDurationMs: 100,
    costClass: "low",
  },

  /* ── network (3) ──────────────────────────────────────────────────── */
  find_operator_organization: {
    bundle: "network",
    requiresApproval: false,
    expectedDurationMs: 300,
    costClass: "low",
  },
  create_matter_invite: {
    bundle: "network",
    requiresApproval: true, // sends external email
    expectedDurationMs: 1200,
    costClass: "low",
  },
  create_solo_matter: {
    bundle: "network",
    requiresApproval: true, // creates mandate (workspace mutation)
    expectedDurationMs: 800,
    costClass: "low",
  },

  /* ── comparison (2) ───────────────────────────────────────────────── */
  compare_jurisdictions_for_filing: {
    bundle: "comparison",
    requiresApproval: false,
    expectedDurationMs: 400,
    costClass: "low",
  },
  summarize_changes_since: {
    bundle: "comparison",
    requiresApproval: false,
    expectedDurationMs: 600,
    costClass: "medium",
  },

  /* ── deadlines (1) ────────────────────────────────────────────────── */
  get_filing_deadlines: {
    bundle: "deadlines",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },

  /* ── drafting (7) — all high-cost LLM calls ───────────────────────── */
  draft_authorization_application: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 12_000,
    costClass: "high",
  },
  draft_compliance_brief: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 10_000,
    costClass: "high",
  },
  draft_schriftsatz: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 15_000,
    costClass: "high",
  },
  draft_mandantenbrief: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 8_000,
    costClass: "high",
  },
  draft_vertrag: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 14_000,
    costClass: "high",
  },
  draft_aktennotiz: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 7_000,
    costClass: "high",
  },
  refine_document: {
    bundle: "drafting",
    requiresApproval: true,
    expectedDurationMs: 10_000,
    costClass: "high",
  },

  /* ── compliance (8) — engine-wrappers, pure data ──────────────────── */
  assess_eu_space_act: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  classify_nis2: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  assess_national_space_law: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  assess_uk_space_industry: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  assess_us_regulatory: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  classify_export_control: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  check_spectrum_filing: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },
  check_copuos_compliance: {
    bundle: "compliance",
    requiresApproval: false,
    expectedDurationMs: 150,
    costClass: "low",
  },

  /* ── validity (4) ─────────────────────────────────────────────────── */
  check_article_status: {
    bundle: "validity",
    requiresApproval: false,
    expectedDurationMs: 100,
    costClass: "low",
  },
  get_recent_norm_changes: {
    bundle: "validity",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  find_related_norms: {
    bundle: "validity",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  track_amendment: {
    bundle: "validity",
    requiresApproval: false, // idempotent, no destructive side-effect
    expectedDurationMs: 250,
    costClass: "low",
  },

  /* ── document (6) ─────────────────────────────────────────────────── */
  extract_text_from_pdf: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 200,
    costClass: "low",
  },
  find_clauses: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 300,
    costClass: "low",
  },
  summarize_document: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 6_000,
    costClass: "medium",
  },
  classify_document: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 3_000,
    costClass: "medium",
  },
  compare_documents: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 10_000,
    costClass: "high",
  },
  search_mandate_knowledge: {
    bundle: "document",
    requiresApproval: false,
    expectedDurationMs: 800,
    costClass: "medium",
  },

  /* ── web (4) ──────────────────────────────────────────────────────── */
  web_search: {
    bundle: "web",
    requiresApproval: false,
    expectedDurationMs: 1500,
    costClass: "low",
  },
  fetch_url: {
    bundle: "web",
    requiresApproval: false,
    expectedDurationMs: 2000,
    costClass: "low",
  },
  search_eurlex: {
    bundle: "web",
    requiresApproval: false,
    expectedDurationMs: 1500,
    costClass: "low",
  },
  search_courtlistener: {
    bundle: "web",
    requiresApproval: false,
    expectedDurationMs: 1500,
    costClass: "low",
  },

  /* ── agent-mode (1) ───────────────────────────────────────────────── */
  delegate_subtasks: {
    bundle: "agent",
    requiresApproval: true, // fires up to 4 parallel sub-agents
    expectedDurationMs: 20_000,
    costClass: "high",
  },
};

/** Lookup by name. Returns undefined for unknown tools (caller decides
 *  whether undefined is acceptable). */
export function getToolMetadata(name: string): AtlasToolMetadata | undefined {
  return TOOL_METADATA[name];
}

/**
 * Drift validator. Pass the live ATLAS_TOOLS array (from atlas-tools.ts);
 * throws if any tool is missing metadata or vice versa. The unit test
 * suite calls this so the two files stay in sync.
 */
export function assertAllToolsHaveMetadata(
  tools: ReadonlyArray<{ name: string }>,
): void {
  const definedNames = new Set(Object.keys(TOOL_METADATA));
  const liveNames = new Set(tools.map((t) => t.name));

  const missingMetadata: string[] = [];
  for (const name of liveNames) {
    if (!definedNames.has(name)) missingMetadata.push(name);
  }
  const orphanedMetadata: string[] = [];
  for (const name of definedNames) {
    if (!liveNames.has(name)) orphanedMetadata.push(name);
  }

  if (missingMetadata.length > 0 || orphanedMetadata.length > 0) {
    const parts: string[] = [];
    if (missingMetadata.length > 0) {
      parts.push(
        `Tools missing metadata in tool-metadata.ts: ${missingMetadata.sort().join(", ")}`,
      );
    }
    if (orphanedMetadata.length > 0) {
      parts.push(
        `Orphaned metadata (no live tool with this name): ${orphanedMetadata.sort().join(", ")}`,
      );
    }
    throw new Error(`Atlas tool-metadata drift: ${parts.join("; ")}`);
  }
}

/** Aggregate stats useful for the audit dashboard. */
export function metadataStats(): {
  total: number;
  byBundle: Record<AtlasToolBundle, number>;
  byCostClass: Record<AtlasToolCostClass, number>;
  approvalRequired: number;
} {
  const byBundle: Record<string, number> = {};
  const byCostClass: Record<string, number> = {};
  let approvalRequired = 0;

  for (const meta of Object.values(TOOL_METADATA)) {
    byBundle[meta.bundle] = (byBundle[meta.bundle] ?? 0) + 1;
    byCostClass[meta.costClass] = (byCostClass[meta.costClass] ?? 0) + 1;
    if (meta.requiresApproval) approvalRequired += 1;
  }

  return {
    total: Object.keys(TOOL_METADATA).length,
    byBundle: byBundle as Record<AtlasToolBundle, number>,
    byCostClass: byCostClass as Record<AtlasToolCostClass, number>,
    approvalRequired,
  };
}

/**
 * Aggregate a list of TOOL CALLS (potentially with duplicates) into
 * per-bundle + per-cost-class counts. Used by audit-log enrichment +
 * analytics dashboards to slice activity by bundle without scanning
 * the raw tools-used array.
 *
 * Unknown tools (no metadata entry) are counted under
 * `unknownToolCount` rather than silently dropped — caller can alert
 * on this to catch drift between the live ATLAS_TOOLS array and the
 * metadata map.
 */
export interface ToolCallAggregate {
  totalCalls: number;
  byBundle: Partial<Record<AtlasToolBundle, number>>;
  byCostClass: Partial<Record<AtlasToolCostClass, number>>;
  approvalRequiredCalls: number;
  /** Estimated total wall-clock if every call took its
   *  expected-duration. Useful for surfacing "this turn used ~12s of
   *  high-cost calls" in admin views. */
  estimatedDurationMs: number;
  /** Tools used that aren't in TOOL_METADATA — caller can surface as
   *  a drift warning. */
  unknownToolCount: number;
  unknownToolNames: string[];
}

export function aggregateToolCalls(
  toolNames: readonly string[],
): ToolCallAggregate {
  const byBundle: Partial<Record<AtlasToolBundle, number>> = {};
  const byCostClass: Partial<Record<AtlasToolCostClass, number>> = {};
  let approvalRequiredCalls = 0;
  let estimatedDurationMs = 0;
  const unknownTools = new Set<string>();

  for (const name of toolNames) {
    const meta = TOOL_METADATA[name];
    if (!meta) {
      unknownTools.add(name);
      continue;
    }
    byBundle[meta.bundle] = (byBundle[meta.bundle] ?? 0) + 1;
    byCostClass[meta.costClass] = (byCostClass[meta.costClass] ?? 0) + 1;
    if (meta.requiresApproval) approvalRequiredCalls += 1;
    estimatedDurationMs += meta.expectedDurationMs;
  }

  return {
    totalCalls: toolNames.length,
    byBundle,
    byCostClass,
    approvalRequiredCalls,
    estimatedDurationMs,
    unknownToolCount: unknownTools.size,
    unknownToolNames: [...unknownTools].sort(),
  };
}
