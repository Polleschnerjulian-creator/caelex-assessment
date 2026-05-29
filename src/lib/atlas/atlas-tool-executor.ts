import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Tool Executor — runs the workspace-level tools defined in
 * atlas-tools.ts. Distinct from matter-tool-executor (which operates
 * INSIDE a scope-gated mandate) — these run at the firm-member level
 * and route users between matters.
 *
 * Every tool call:
 *   1. Zod-validates input
 *   2. Prisma query scoped to `callerOrgId` as law firm
 *   3. Returns JSON payload Claude will paraphrase + a UI directive
 *      (navigateUrl) the SSE layer forwards to the client
 *
 * No audit log — these are read-only directory lookups over the firm's
 * own matters, not cross-firm data access.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { AtlasToolName } from "./atlas-tools";
import {
  isComplianceToolName,
  executeComplianceTool,
} from "./compliance-tools.server";
import {
  isValidityToolName,
  executeValidityTool,
} from "./validity-tools.server";
import {
  isDocumentToolName,
  executeDocumentTool,
} from "./document-tools.server";
import {
  isBrandingToolName,
  executeBrandingTool,
} from "./branding-tools.server";
import { isMandateToolName, executeMandateTool } from "./mandate-tools.server";
import {
  isDeadlinesToolName,
  executeDeadlinesTool,
} from "./deadlines-tools.server";
import {
  isTemplatesToolName,
  executeTemplatesTool,
} from "./templates-tools.server";
import { isKorpusToolName, executeKorpusTool } from "./korpus-tools.server";
import {
  isComparisonToolName,
  executeComparisonTool,
} from "./comparison-tools.server";
import { isNetworkToolName, executeNetworkTool } from "./network-tools.server";
import {
  isDraftingToolName,
  executeDraftingTool,
} from "./drafting-tools.server";
import { isWebToolName, executeWebTool } from "./web-tools.server";

/* Post-T0.1.i, the executor is a pure dispatcher shell. All bundle-
   level imports (prisma, logger, zod, encryption, data-corpus modules,
   scaffold-context loader) live in the individual bundles. The
   executor's only responsibility is routing by tool-name to the
   appropriate bundle. */

// ─── Shared result shape ─────────────────────────────────────────────

export interface AtlasToolResult {
  /** JSON-string payload fed back to Claude as tool_result. */
  content: string;
  /** True on validation / scope failures. */
  isError: boolean;
  /** Optional client navigation directive — the SSE route forwards this
   *  as a `navigate` event, the AIMode client calls router.push(). Only
   *  set on unambiguous single-match 'open' calls. */
  navigateUrl?: string;
}

/* find_or_open_matter moved to mandate-tools.server.ts as part of
   Atlas V3 T0.1.b bundle-split (2026-05-26). Routed via the
   isMandateToolName guard at the top of executeAtlasTool() above. */

/* Network tools (find_operator_organization, create_matter_invite,
   create_solo_matter) moved to network-tools.server.ts as part of
   Atlas V3 T0.1.e bundle-split (2026-05-26). Includes the
   dispatchInviteEmailBestEffort helper, SCOPE_LEVELS import,
   matter-service integration, and the encryption-aware solo-matter
   create path. */

/* Drafting tools (draft_authorization_application, draft_compliance_brief,
   draft_schriftsatz, draft_mandantenbrief, draft_vertrag, draft_aktennotiz,
   refine_document) moved to drafting-tools.server.ts as part of Atlas V3
   T0.1.h bundle-split (2026-05-26). All helpers (topLicensingSources,
   OPERATOR_TYPES constant, all 7 zod schemas, DRAFT_DISCLAIMER_DE,
   PRIVILEGE_BANNER_DE) moved with the bundle. Routed via isDraftingToolName
   guard at the top of executeAtlasTool() above. */

export async function executeAtlasTool(args: {
  name: AtlasToolName | string;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  /* Atlas M2 (Vault-RAG): the mandate currently attached to the chat,
     if any. Required by `search_mandate_vault` so the RAG retrieval
     can be mandate-scoped. Optional everywhere else — existing call-
     sites that don't pass it (agent/route.ts, ai-chat/route.ts) keep
     working, the mandate-only tools just refuse politely when null. */
  mandateId?: string | null;
}): Promise<AtlasToolResult> {
  /* Atlas V2 Sprint 3: route compliance tools (8 engine wrappers) to
     the dedicated compliance dispatch. They are pure-data tools that
     don't need callerUserId/callerOrgId. See compliance-tools.server.ts. */
  if (typeof args.name === "string" && isComplianceToolName(args.name)) {
    return executeComplianceTool(args.name, args.input);
  }
  /* Atlas V2 Sprint 4 + V3 T1.B.11: route validity tools (4 now —
     check_article_status, get_recent_norm_changes, find_related_norms,
     track_amendment) to the dedicated validity dispatch. The first
     three are pure-data lookups; track_amendment needs caller
     identity to write the AtlasAlertSubscription row, so we forward
     ctx = { callerUserId, callerOrgId }. The dispatcher refuses the
     write politely when ctx is absent. */
  if (typeof args.name === "string" && isValidityToolName(args.name)) {
    return executeValidityTool(args.name, args.input, {
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
    });
  }
  /* Atlas V2 Sprint 5: route document tools (5 file-aware tools) to
     the dedicated document dispatch — they NEED callerUserId +
     callerOrgId for AtlasMandateFile membership-gated reads. */
  if (typeof args.name === "string" && isDocumentToolName(args.name)) {
    return executeDocumentTool({
      name: args.name,
      input: args.input,
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
    });
  }
  /* Atlas V3 T0.1: route branding tools (2 letterhead/kanzlei-data
     tools) to the dedicated branding dispatch. Pure callerOrgId-
     scoped — no caller-user or mandate context needed. */
  if (typeof args.name === "string" && isBrandingToolName(args.name)) {
    return executeBrandingTool({
      name: args.name,
      input: args.input,
      callerOrgId: args.callerOrgId,
    });
  }
  /* Atlas V3 T0.1.b: route mandate tools to dedicated mandate
     dispatch. Currently one tool (find_or_open_matter) — the bundle
     return type carries the optional navigateUrl that the SSE layer
     forwards to clients for single-match 'open' calls. */
  if (typeof args.name === "string" && isMandateToolName(args.name)) {
    return executeMandateTool({
      name: args.name,
      input: args.input,
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
      mandateId: args.mandateId,
    });
  }
  /* Atlas V3 T0.1.g: route deadlines tools (get_filing_deadlines)
     to dedicated deadlines dispatch. Pure-data tool, no caller
     context needed. */
  if (typeof args.name === "string" && isDeadlinesToolName(args.name)) {
    return executeDeadlinesTool({
      name: args.name,
      input: args.input,
    });
  }
  /* Atlas V3 T0.1.c: route templates tools (4: list_workspace_templates,
     save/list/use_document_template) to dedicated templates dispatch.
     The document-template variants need caller + org + mandate
     context for tokenization; list_workspace_templates is a pure
     static-catalogue lookup but uses the same dispatcher for
     uniformity. */
  if (typeof args.name === "string" && isTemplatesToolName(args.name)) {
    return executeTemplatesTool({
      name: args.name,
      input: args.input,
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
      mandateId: args.mandateId,
    });
  }
  /* Atlas V3 T0.1.d: route korpus tools (5: search_legal_sources,
     get_legal_source_by_id, list_jurisdiction_authorities,
     search_cases, get_case_by_id) to dedicated korpus dispatch.
     Pure-data tools, no caller context needed (mandates aren't
     scoped — the catalogue is global per-deployment). */
  if (typeof args.name === "string" && isKorpusToolName(args.name)) {
    return executeKorpusTool({
      name: args.name,
      input: args.input,
    });
  }
  /* Atlas V3 T0.1.f: route comparison tools (compare_jurisdictions_for_filing,
     summarize_changes_since) to dedicated comparison dispatch. Mix of
     pure-data (cross-JD matrix) + DB-backed (AtlasUpdate feed). */
  if (typeof args.name === "string" && isComparisonToolName(args.name)) {
    return executeComparisonTool({
      name: args.name,
      input: args.input,
    });
  }
  /* Atlas V3 T0.1.e: route network tools (find_operator_organization,
     create_matter_invite, create_solo_matter) to dedicated network
     dispatch. create_* tools return navigateUrl for client-side
     workspace navigation. */
  if (typeof args.name === "string" && isNetworkToolName(args.name)) {
    return executeNetworkTool({
      name: args.name,
      input: args.input,
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
    });
  }
  /* Atlas V3 T0.1.h: route drafting tools (7: draft_authorization_application,
     draft_compliance_brief, draft_schriftsatz, draft_mandantenbrief,
     draft_vertrag, draft_aktennotiz, refine_document) to dedicated
     drafting dispatch. Auto-loads mandate context via the shared
     scaffold-context module when mandateId is present. */
  if (typeof args.name === "string" && isDraftingToolName(args.name)) {
    return executeDraftingTool({
      name: args.name,
      input: args.input,
      callerUserId: args.callerUserId,
      callerOrgId: args.callerOrgId,
      mandateId: args.mandateId,
    });
  }
  /* Atlas V3 T1.D: route web tools (web_search, fetch_url,
     search_eurlex, search_courtlistener) to dedicated web dispatch.
     All 4 use FREE public APIs (DuckDuckGo Instant Answer, native
     fetch + HTML strip, EUR-Lex public search, CourtListener REST
     free tier). No paid SaaS, no auth required. */
  if (typeof args.name === "string" && isWebToolName(args.name)) {
    return executeWebTool({
      name: args.name,
      input: args.input,
    });
  }
  /* search_mandate_vault moved into the Mandate bundle as part of
     Atlas V3 T0.1.i final cleanup (2026-05-26). No longer needs the
     pre-switch special-case routing — it routes via isMandateToolName
     above. The mandate dispatcher now accepts an optional mandateId
     for the Vault-RAG path. */
  switch (args.name as AtlasToolName) {
    /* find_or_open_matter early-routed via isMandateToolName above
       (Atlas V3 T0.1.b bundle-split).
       find_operator_organization, create_matter_invite, create_solo_matter
       early-routed via isNetworkToolName above (Atlas V3 T0.1.e). */
    /* search_legal_sources, get_legal_source_by_id,
       list_jurisdiction_authorities, search_cases, get_case_by_id
       early-routed via isKorpusToolName above (Atlas V3 T0.1.d
       bundle-split). list_workspace_templates handled by templates
       bundle (T0.1.c). */
    /* All 7 drafting tools (draft_authorization_application,
       draft_compliance_brief, draft_schriftsatz, draft_mandantenbrief,
       draft_vertrag, draft_aktennotiz, refine_document) early-routed
       via isDraftingToolName above (Atlas V3 T0.1.h bundle-split).
       compare_jurisdictions_for_filing + summarize_changes_since
       early-routed via isComparisonToolName (T0.1.f).
       get_filing_deadlines early-routed via isDeadlinesToolName
       (T0.1.g). */
    /* Sprint 12 C — letterhead via chat. get_org_branding /
       set_org_branding now early-route via isBrandingToolName above
       (Atlas V3 T0.1 bundle-split, 2026-05-26). Cases removed,
       helpers moved to branding-tools.server.ts. */

    /* Sprint 12 D — document templates (save/list/use) early-routed
       via isTemplatesToolName above (Atlas V3 T0.1.c bundle-split,
       2026-05-26). Cases + helper functions + zod schemas + tokenize-
       Body all moved to templates-tools.server.ts. */
    default: {
      const _never: never = args.name;
      return {
        content: JSON.stringify({
          error: `Unknown tool: ${String(_never)}`,
          code: "UNKNOWN_TOOL",
        }),
        isError: true,
      };
    }
  }
}

/* search_mandate_vault — Vault-RAG (M2) — moved to mandate-tools.server.ts
   as part of Atlas V3 T0.1.i final cleanup (2026-05-26). The
   SearchMandateVaultInput schema, embed-and-rank logic, pgvector
   query, indirect-prompt-injection guard via <vault_content> tags,
   and 0.4-similarity threshold all live in the mandate bundle now. */
