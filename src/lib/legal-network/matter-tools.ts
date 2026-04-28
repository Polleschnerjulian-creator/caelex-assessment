import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Matter Tools — Claude-callable functions for Phase 3 data bridge.
 *
 * Each tool definition mirrors an Anthropic SDK Tool schema. The
 * actual execution is in `matter-tool-executor.ts`; this file is
 * just the contract Claude sees (names, descriptions, input schemas).
 *
 * Phase 3a: one tool, `load_compliance_overview`. Claude can request
 * the client-operator's current compliance state (assessments,
 * statuses) scoped by the matter. Every call is gated through
 * `requireActiveMatter` and audit-logged.
 *
 * Future iterations will add: load_authorization_workflow,
 * load_deadlines, search_legal_sources, draft_memo, compare_
 * jurisdictions. Keep additions additive — never break Claude's
 * understanding of an existing tool.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";

export const MATTER_TOOLS: Anthropic.Tool[] = [
  {
    name: "load_compliance_overview",
    description: `Loads the CURRENT compliance state of the client operator. Returns counts and summary statuses for the five core assessment types: cybersecurity, NIS2, debris mitigation, insurance, environmental.

Call this when the user asks anything about "how is the client doing", "current status", "what's open", "what's missing", or when drafting a memo that needs grounded facts. Do NOT invent compliance numbers — always load them.

Access is subject to the matter's consented scope on COMPLIANCE_ASSESSMENTS (READ or READ_SUMMARY permission required). If the scope is missing, this tool returns an error; the user should be told their current scope doesn't authorise this, and to request a scope amendment.

Returns a JSON summary — not the raw records. The summary is designed to fit in a single response turn without overwhelming the context window.`,
    input_schema: {
      type: "object",
      properties: {
        detail_level: {
          type: "string",
          enum: ["summary", "full"],
          description:
            "`summary` returns just counts and statuses. `full` adds the top 3 most recent records per assessment type with their key fields. Default summary.",
        },
      },
    },
  },

  {
    name: "search_legal_sources",
    description: `Searches Atlas's curated legal corpus (800+ space-law instruments) via semantic similarity. Use this WHENEVER you need to cite a specific regulation, article, or paragraph — do not invent citations from memory.

Good queries are concept-level: "satellite licensing authority Germany", "re-entry safety obligations EU", "NIS2 incident reporting timelines". Returns the top 5 matches with jurisdiction, title, and relevance score. After picking a match, quote it precisely in your answer; direct users to the source URL so they can read the original text.

This tool does NOT require any scope on the matter — the Atlas corpus is shared across all firms and clients. It's always safe to call.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Concept-level search query in any supported language (EN/DE/FR/ES). 4-200 characters.",
        },
        limit: {
          type: "number",
          description: "Number of matches to return, 1-10. Default 5.",
        },
      },
      required: ["query"],
    },
  },

  {
    name: "list_matter_documents",
    description: `Lists documents from the client's vault — filings, licenses, certificates, insurance policies, technical specs, etc. Returns the most recent matches with name, category, status, file size, and (when storage URL is available) a download link.

Use this when the user asks "what documents do we have", "find the insurance certificate", "show me filings on this matter", or before drafting a memo that needs evidence references.

Access requires READ on DOCUMENTS scope. If the matter doesn't grant it, the tool returns an access-denied error and the user should be told to request a scope amendment for DOCUMENTS.

Filters:
  - query: optional fuzzy match on document name + filename
  - category: optional DocumentCategory enum filter (LICENSE, AUTHORIZATION, INSURANCE_POLICY, COMPLIANCE_REPORT, TECHNICAL_SPEC, …). Pass a single value, case-sensitive.
  - status: optional, defaults to non-deleted. Use "ACTIVE" or "APPROVED" to focus on live documents only.
  - limit: 1-25, default 10.

Returns the latest version per document chain (isLatest=true). Older versions aren't surfaced — they're available via a future history endpoint.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Optional fuzzy match on document name + fileName. 0-100 chars.",
        },
        category: {
          type: "string",
          description:
            "Optional DocumentCategory filter. One of: LICENSE, PERMIT, AUTHORIZATION, CERTIFICATE, ISO_CERTIFICATE, SECURITY_CERT, INSURANCE_POLICY, INSURANCE_CERT, COMPLIANCE_REPORT, AUDIT_REPORT, INCIDENT_REPORT, ANNUAL_REPORT, TECHNICAL_SPEC, DESIGN_DOC, TEST_REPORT, SAFETY_ANALYSIS, CONTRACT, NDA, SLA, REGULATORY_FILING, CORRESPONDENCE, NOTIFICATION, POLICY, PROCEDURE, TRAINING, OTHER.",
        },
        status: {
          type: "string",
          description:
            "Optional DocumentStatus filter (DRAFT, PENDING_REVIEW, UNDER_REVIEW, PENDING_APPROVAL, APPROVED, ACTIVE, EXPIRED, SUPERSEDED).",
        },
        limit: {
          type: "number",
          description: "Number of documents to return, 1-25. Default 10.",
        },
      },
    },
  },

  {
    name: "compare_jurisdictions",
    description: `Generates a side-by-side comparison of 2-5 European space-law jurisdictions on the dimensions that lawyers most often need: licensing authority, mandatory insurance, debris mitigation requirements, processing timelines, EU Space Act relationship, etc.

Source: Atlas's curated jurisdiction database (covering FR, DE, IT, UK, LU, NL, BE, ES, AT, PL, DK, NO, SE, FI, PT, GR, CZ, IE, CH, US, NZ, and more). Static data — does NOT consume client matter scope. Always safe to call.

Use this when the user asks comparative questions: "Vergleiche DE und FR Lizenzregime", "Welche EU-Jurisdiktion ist günstigster für Mega-Constellations", "How does NL differ from BE on operator authorisation". Do NOT invent jurisdiction facts — call this tool.

Returns a structured payload with each jurisdiction's key fields. The pinboard renders it as a side-by-side ComparisonCard. After the tool returns, summarise the most relevant differences in 2-4 bullets — the card has the full data.

Country codes follow ISO 3166-1 alpha-2 (DE, FR, UK, etc.). Lower-case is also accepted.`,
    input_schema: {
      type: "object",
      properties: {
        jurisdictions: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 5,
          description:
            "2-5 country codes (ISO 3166-1 alpha-2, e.g. ['DE', 'FR', 'IT']). Will be matched case-insensitively against the Atlas jurisdiction database.",
        },
        topic: {
          type: "string",
          description:
            "Optional focus area to highlight: 'licensing', 'insurance', 'debris', 'timeline', 'eu-space-act'. Affects which fields are emphasised in the comparison; the full payload is always returned.",
        },
      },
      required: ["jurisdictions"],
    },
  },

  {
    name: "draft_memo_to_note",
    description: `Saves the current draft content as a persistent Matter Note. Use this at the end of a conversation when the user has asked you to produce a memo, summary, or draft — you write the content to a note so the lawyer can find it later in the Notes tab.

Do NOT call this unprompted. Only when the user explicitly says "save this", "draft a memo", "write this up", or similar. Confirm the note title with the user before saving if it's ambiguous.

Requires a scope granting ANNOTATE on any category (notes are firm-internal metadata, not client data — the scope check is a consistency guard, not a privacy gate).`,
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Short descriptive title, 3-200 chars. E.g. 'Memo — FR spectrum licensing timeline'.",
        },
        content: {
          type: "string",
          description:
            "The full memo/note content, Markdown-formatted. Can be up to 100k chars.",
        },
      },
      required: ["title", "content"],
    },
  },
];

/**
 * Tool name lookup — used by the executor to dispatch by name.
 */
export type MatterToolName =
  | "load_compliance_overview"
  | "search_legal_sources"
  | "list_matter_documents"
  | "compare_jurisdictions"
  | "draft_memo_to_note";

export function isMatterToolName(name: string): name is MatterToolName {
  return MATTER_TOOLS.some((t) => t.name === name);
}
