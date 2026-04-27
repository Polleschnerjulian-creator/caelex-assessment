import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas Tools — Claude-callable functions for the generic Atlas AI
 * Mode (/api/atlas/ai-chat). These differ from the matter-scoped tools
 * (matter-tools.ts): those only work inside a specific mandate with
 * consented scope, while these are *workspace-level* — they help users
 * find and open mandates, not read their data.
 *
 * Phase 6a: one tool, `find_or_open_matter`. The client-side SSE
 * handler translates its response into a `navigate` event that pushes
 * the user into the matter workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";

export const ATLAS_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_operator_organization",
    description: `Searches the Caelex operator-organisation directory (all registered satellite operators / launch providers / space-service companies) by name fragment. Use this before \`create_matter_invite\` to resolve a client name to an orgId — never pass a guessed id.

Matches are fuzzy (case-insensitive contains on name + slug). Only ACTIVE operator orgs are returned. Max 8 candidates.

After calling:
  - 1 match → use its \`id\` in create_matter_invite, confirm the org name with user.
  - Multiple matches → list numbered, ask user to pick.
  - Zero matches → tell user the operator is not (yet) on Caelex; they must sign up first or invite them via email (not supported by this tool).`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text org name fragment (e.g. 'Rocket', 'Arianespace', 'Planet Labs'). 2-100 characters.",
        },
      },
      required: ["query"],
    },
  },

  {
    name: "create_matter_invite",
    description: `Creates a bilateral matter invitation from the caller's law firm to a Caelex operator org. The operator must still accept (handshake), but from Atlas's side the mandate draft is persisted and the invitation email is sent to the operator's OWNER.

HARD RULE — confirmation flow:
  1. On first call for a given mandate, ALWAYS pass action='preview'. Returns a dry-run payload with operator name + proposed scope + expiry.
  2. Only after the user has explicitly approved in natural language (e.g. 'ja, schick', 'bestätigt', 'go'), call again with action='create'.
  Never create without a preview turn first — even if the user was very explicit, the preview shows the operator org resolution which may surprise them.

On successful create, the client automatically navigates into the new matter's workspace (hero state — no conversations yet). The invitation email dispatch happens best-effort; even if email fails the mandate is created and the user gets the workspace link.

Scope levels:
  - 'advisory' (L1) — read + summaries only. One-off advisory work.
  - 'active_counsel' (L2) — read + annotate on compliance/auth/docs/timeline/incidents. Ongoing mandate.
  - 'full_counsel' (L3) — L2 + export + spacecraft registry. Full legal representation.

Defaults: scope_level='active_counsel', duration_months=12.`,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["preview", "create"],
          description:
            "'preview' for dry-run (mandatory first turn); 'create' to actually persist + send email.",
        },
        operator_org_id: {
          type: "string",
          description:
            "cuid of the operator org (resolved via find_operator_organization first).",
        },
        matter_name: {
          type: "string",
          description:
            "Human-readable mandate name, 3-200 chars. E.g. 'ESA Copernicus — NIS2 Compliance', 'Rocket Inc — Launch Authorization'.",
        },
        reference: {
          type: "string",
          description:
            "Optional firm-internal reference number, e.g. 'BHO-2026-112'. Max 50 chars.",
        },
        scope_level: {
          type: "string",
          enum: ["advisory", "active_counsel", "full_counsel"],
          description:
            "Predefined scope tier. Use advisory for one-off questions, active_counsel for ongoing mandates, full_counsel for full representation.",
        },
        duration_months: {
          type: "number",
          description: "Validity in months, 1-60. Default 12.",
        },
      },
      required: ["action", "operator_org_id", "matter_name"],
    },
  },

  {
    name: "find_or_open_matter",
    description: `Searches the user's law-firm for matching mandates (matters) by name or reference and either lists candidates or navigates directly into a matter's workspace.

Call this when the user asks to "open a workspace for client XY", "zeig mir den Mandant XY", "search my matters", "finde mein Mandat mit der Ref ATLAS-2025-003", or similar intent-to-switch-context phrases.

Scope:
  - Only matters where the caller's current organisation is the law firm.
  - Only ACTIVE matters are navigable ('open' action). SUSPENDED/REVOKED/CLOSED matters will appear in search results with a status flag but cannot be opened — tell the user why.
  - Search is fuzzy on matter name and reference (case-insensitive contains).

Actions:
  - 'open': Use when the user expresses a direct wish to enter a workspace AND the search is specific enough that you expect a single match. If the lookup finds exactly one active matter, the client will auto-navigate to it. If it finds zero or multiple, the tool returns the candidates so you can disambiguate with the user.
  - 'search': Use when the user wants an overview. Always returns a candidate list; no auto-navigation.

Style after calling:
  - On single-match 'open': briefly confirm (e.g. "Öffne Workspace zu 'Mandant XY'…") — the client handles navigation.
  - On multi-match: list the matches (1. …, 2. …) and ask the user to pick one by number or clarify.
  - On zero matches: suggest creating a new matter via /atlas/network.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "User's free-text description of the matter to find. Typical inputs: client name fragment, matter reference ('ATLAS-2025-003'), or short description. 2-100 characters.",
        },
        action: {
          type: "string",
          enum: ["search", "open"],
          description:
            "'open' auto-navigates on single match; 'search' always lists. When in doubt, use 'open' — a multi-hit still returns the list without navigating.",
        },
      },
      required: ["query", "action"],
    },
  },

  // ───────────────────────────────────────────────────────────────────
  // Legal-source navigation tools — added 2026-04 to give Astra explicit
  // ID-routing across the catalogue rather than relying on vector recall
  // for cross-cutting sources (sanctions, standards, ITU, insurance,
  // sectoral, EU programmes). The tools complement library-recall: when
  // the lawyer asks something specific ("show me ITU coordination
  // procedure"), Astra invokes get_legal_source_by_id directly; for
  // open-ended questions Astra still falls back on vector recall over
  // the embedded library.
  // ───────────────────────────────────────────────────────────────────

  {
    name: "search_legal_sources",
    description: `Searches the Atlas legal-source catalogue (treaties, statutes, regulations, technical standards, policy documents, draft legislation) by free-text query. Returns up to 10 matches ranked by relevance, each with id, jurisdiction, type, status, title, and one-line scope_description.

Use this when the user asks discovery-style questions like:
  - "Welche EU-Sanktionen gegen Russland gelten für Raumfahrt-Hardware?"
  - "Show me the ITU coordination rules"
  - "What's in the Critical Raw Materials Act?"
  - "Find all sources about debris mitigation in Japan"

After calling, paraphrase the matches and offer to drill into a specific source via get_legal_source_by_id.

Filters: jurisdiction (ISO code or "INT"/"EU"), type (international_treaty | federal_law | federal_regulation | technical_standard | eu_regulation | eu_directive | policy_document | draft_legislation), compliance_area (licensing | registration | liability | insurance | cybersecurity | export_control | data_security | frequency_spectrum | environmental | debris_mitigation | space_traffic_management | human_spaceflight | military_dual_use). Combine filters as needed — narrow searches return better results than broad ones.

Score 0-1 per match (substring + title-position). Min returned score is 0.05.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query string. 2-200 characters. Tokens, abbreviations, and case-insensitive. E.g. 'NIS2 transposition Germany', 'WRC-23', 'Lloyd's space insurance'.",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional jurisdiction filter — ISO alpha-2/3 code (DE, FR, UK, US, ...), 'INT' for international treaties, 'EU' for EU instruments. Omit to search all.",
        },
        type: {
          type: "string",
          enum: [
            "international_treaty",
            "federal_law",
            "federal_regulation",
            "technical_standard",
            "eu_regulation",
            "eu_directive",
            "policy_document",
            "draft_legislation",
          ],
          description: "Optional source-type filter. Omit to search all types.",
        },
        compliance_area: {
          type: "string",
          enum: [
            "licensing",
            "registration",
            "liability",
            "insurance",
            "cybersecurity",
            "export_control",
            "data_security",
            "frequency_spectrum",
            "environmental",
            "debris_mitigation",
            "space_traffic_management",
            "human_spaceflight",
            "military_dual_use",
          ],
          description:
            "Optional compliance-area filter. Omit to search all areas.",
        },
      },
      required: ["query"],
    },
  },

  {
    name: "get_legal_source_by_id",
    description: `Retrieves a single Atlas legal-source entry by its canonical id. Returns the full record: title, scope_description, all key_provisions with summaries and complianceImplications, related_sources, amends/amended_by chain, and notes. Use this AFTER search_legal_sources has identified the source the user wants to drill into, OR when the user mentions an ID directly (e.g. "tell me about INT-WASSENAAR" or "Atlas-ID DE-VVG").

Prefer this over vector recall when the user names a specific instrument. Returns isError=true with a 'NOT_FOUND' code if the id does not resolve — then offer search_legal_sources as fallback.`,
    input_schema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description:
            "Canonical Atlas source id (e.g. 'INT-OST-1967', 'DE-SATDSIG-2007', 'EU-NIS2-2022', 'INT-WASSENAAR'). Format: jurisdiction prefix + hyphen + identifier.",
        },
      },
      required: ["source_id"],
    },
  },

  {
    name: "list_workspace_templates",
    description: `Lists the available Atlas workspace templates. Each template is a pre-seeded Pinboard with 3-7 source cards covering a common mandate type — DE Satelliten-Lizenz, NIS2-Compliance, Cross-Border DE-FR, Sanctions-Diligence, ITU-Filing, Insurance-Placement.

Use this when the user describes a mandate type and asks "wo fange ich an?", "welche Vorlage passt?", or starts a new mandate. Returns id, title, description, category (license | compliance | comparison | incident | contract), and card count for each. After calling, recommend the best-fit template — the user clicks it in the UI to seed a new workspace.`,
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  {
    name: "list_jurisdiction_authorities",
    description: `Lists the regulatory authorities for a single jurisdiction — name, abbreviation, mandate, applicable areas, and contact info. Use this when the user asks "welche Behörden sind in Frankreich für Raumfahrt zuständig?" or "who licenses launches in Australia?".

For ISO-2/3 country codes the response covers the national regulatory landscape; for "INT"/"EU" returns the multilateral institutions (UNOOSA, ITU, EUSPA, ENISA, EC, etc.).`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Jurisdiction code (ISO alpha-2/3, 'INT', or 'EU'). E.g. 'DE', 'FR', 'UK', 'US', 'JP', 'IN', 'AU', 'INT', 'EU'.",
        },
      },
      required: ["jurisdiction"],
    },
  },
];

export type AtlasToolName =
  | "find_or_open_matter"
  | "find_operator_organization"
  | "create_matter_invite"
  | "search_legal_sources"
  | "get_legal_source_by_id"
  | "list_workspace_templates"
  | "list_jurisdiction_authorities";

export function isAtlasToolName(name: string): name is AtlasToolName {
  return ATLAS_TOOLS.some((t) => t.name === name);
}
