import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import { COMPLIANCE_TOOLS } from "./compliance-tools.server";
import { VALIDITY_TOOLS } from "./validity-tools.server";
import { DOCUMENT_TOOLS } from "./document-tools.server";
import { BRANDING_TOOLS } from "./branding-tools.server";

const CORE_ATLAS_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_operator_organization",
    description: `Searches the Caelex operator-organisation directory (all registered satellite operators / launch providers / space-service companies) by name fragment. Use this before \`create_matter_invite\` to resolve a client name to an orgId — never pass a guessed id.

Matches are fuzzy (case-insensitive contains on name + slug). Only ACTIVE operator orgs are returned. Max 8 candidates.

After calling:
  - 1 match → use its \`id\` in create_matter_invite, confirm the org name with user.
  - Multiple matches → list numbered, ask user to pick.
  - Zero matches → operator is not (yet) on Caelex. **Two options to proceed**:
    (a) **DEFAULT for a project-workspace**: use \`create_solo_matter\` directly with free-text clientName. The lawyer can work in the mandate immediately (vault, chats, agent-runs, deadlines) — no bilateral handshake needed.
    (b) Only when the lawyer explicitly wants a bilateral Caelex-counsel relationship: tell them the operator must sign up at caelex.eu first (not supported by this tool).
  Prefer (a) for "lege ein Mandat an", "mach mir einen Workspace für X" — these don't need the operator on Caelex.`,
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
    name: "create_solo_matter",
    description: `Creates a LAWYER-SIDE-ONLY mandate (project workspace) WITHOUT requiring the operator to be a Caelex-registered org. This is the DEFAULT mandate-creation path for almost all cases. Use this when:
- find_operator_organization returns zero matches AND the lawyer wants a workspace anyway
- the lawyer says "lege ein Mandat an für X", "mach mir einen Workspace für Y", "ich brauch ein Projekt"
- the client/operator is a prospect, an internal project, or just doesn't need a Caelex login

The mandate becomes a FULL project workspace immediately: Vault (files), Chats, Notes, Deadlines, Time-Entries, Agent-Runs, Background-Agent — alles hängt am mandateId.

clientName / clientContact are FREE-TEXT strings (no FK enforcement, no Caelex registration). The lawyer can later upgrade to a bilateral Caelex-counsel relationship via /atlas/network if the operator joins.

Approval flow: this tool starts with \`create_\` prefix and therefore triggers Atlas's automatic approval-gate (Sprint B1). The lawyer sees an approval card with the proposed name/clientName before persistence. Single call (no preview/create split — the approval gate IS the preview).

After successful creation, returns the new \`mandateId\`. The client navigates into the workspace at /atlas/mandate/[id].`,
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Mandate name (3-200 chars). E.g. 'Spire · SAT-2026', 'Internes Compliance-Projekt Q1', 'Akquise Iridium NIS2-Pitch'.",
        },
        clientName: {
          type: "string",
          description:
            "OPTIONAL free-text client/operator name. NO Caelex registration needed. E.g. 'Spire Global GmbH', 'Iridium Communications', 'Intern'.",
        },
        clientContact: {
          type: "string",
          description:
            "OPTIONAL client contact (email or phone). E.g. 'legal@spire.com'.",
        },
        jurisdiction: {
          type: "string",
          description: "OPTIONAL ISO-Code. E.g. 'DE', 'FR', 'EU', 'US'.",
        },
        operatorType: {
          type: "string",
          description:
            "OPTIONAL operator-type tag. E.g. 'satellite_operator', 'launch_provider', 'isos', 'data_provider'.",
        },
        primaryAuthority: {
          type: "string",
          description:
            "OPTIONAL primary regulatory authority. E.g. 'BNetzA', 'CNES', 'FCC', 'ESA'.",
        },
        customInstructions: {
          type: "string",
          description:
            "OPTIONAL Markdown system-prompt suffix injected into every chat of this mandate. Max 4000 chars. Lawyer can edit later.",
        },
      },
      required: ["name"],
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

  {
    name: "search_cases",
    description: `Searches the Atlas case law / enforcement-action knowledge base. Returns leading court decisions, regulator settlements, and Liability-Convention awards that operators must read alongside the statutes — Cosmos-954, Iridium-Cosmos-2009, FCC Swarm/$900K, FCC DISH/$150K, ITT/$100M ITAR, BAE/$79M, ZTE/$1.19B, Loral-Long-March, Viasat-v-FCC, FAA-SpaceX-2024, FCC-Ligado-2020, Vega VV15/VV22 inquiries, BAFA dual-use Bußgelder, etc.

Use this when:
  - User asks about ENFORCEMENT precedents ("welche Strafen gibt es für ITAR-Verstöße?", "what are FCC debris penalties?")
  - User asks about HISTORICAL cases ("hat Cosmos-954 jemals gezahlt?", "warum gibt es keine Article-III-Klagen?")
  - User wants the PRACTICE alongside the STATUTE ("how do regulators actually apply ISO 24113?")
  - User mentions a case name or company in litigation context (Swarm, DISH, Loral, Hughes, BAE, ZTE, Viasat, Ligado, AAIB Cornwall, Vega-failure)

Filter parameters:
  - jurisdiction: ISO-2 / 'INT' / 'EU' to scope by primary forum
  - compliance_area: filter to area (debris_mitigation, export_control, licensing, frequency_spectrum, liability, etc.)
  - applied_source_id: filter to cases that explicitly applied a given legal-source id (e.g. all cases applying INT-LIABILITY-1972)

Returns max 10 hits with title, plaintiff vs. defendant, date_decided, ruling_summary, industry_significance, and applied_sources[]. The case ids returned (e.g. CASE-COSMOS-954-1981) can then be passed to get_case_by_id for full detail, or rendered inline as [CASE-COSMOS-954-1981] which the UI surfaces as a hover-preview pill.

Returns empty array if no matches — say so honestly, do NOT invent cases.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query — case name, company, regulator, key facts. Optional if a filter is supplied.",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional. Restrict to cases where this is the primary forum (ISO alpha-2, 'INT', or 'EU').",
        },
        compliance_area: {
          type: "string",
          description:
            "Optional. Restrict to cases tagged with this compliance area (e.g. 'debris_mitigation', 'export_control', 'licensing', 'liability', 'frequency_spectrum').",
        },
        applied_source_id: {
          type: "string",
          description:
            "Optional. Return only cases whose applied_sources[] contains this legal-source id (e.g. 'INT-LIABILITY-1972', 'US-ITAR', 'INT-IADC-MITIGATION-2020').",
        },
      },
    },
  },

  {
    name: "get_case_by_id",
    description: `Retrieves a single Atlas case law entry by its canonical id (always 'CASE-' prefix). Returns the full record: title, parties, date_decided, citation, facts, ruling_summary, legal_holding, remedy (monetary + non-monetary), industry_significance, compliance_areas, applied_sources[], parties_mentioned, notes, source_url.

Use this AFTER search_cases has identified the entry the user wants to drill into, OR when the user mentions a case id directly. Returns isError=true with NOT_FOUND if the id does not resolve — never invent.

Render inline references to other cases as [CASE-...] tokens; the UI translates them to hover-preview pills. Same applies to legal-source references like [US-ITAR] in your prose response.`,
    input_schema: {
      type: "object",
      properties: {
        case_id: {
          type: "string",
          description:
            "Canonical Atlas case id (always starts with 'CASE-'). E.g. 'CASE-COSMOS-954-1981', 'CASE-FCC-SWARM-2018', 'CASE-ITT-ITAR-2007', 'CASE-VEGA-VV15-2019'.",
        },
      },
      required: ["case_id"],
    },
  },

  // ─── Drafting tools ───────────────────────────────────────────────
  // The drafting tools turn Atlas from a research surface into a
  // working-output surface. Each tool returns a STRUCTURED SCAFFOLD —
  // never finished prose. The Astra agent (the model itself) composes
  // the final draft using the scaffold, the cited sources, and the
  // operator context the user supplied.
  //
  // HARD RULE — drafting outputs are first-pass scaffolds, not legal
  // advice. ALWAYS prefix the user-facing draft with the standard
  // legal-review disclaimer (see system prompt).

  {
    name: "draft_authorization_application",
    description: `Builds a structured scaffold for a national space-licence / launch-authorisation application. Returns the binding legal framework, the competent authority, mandatory application sections (with what each must contain), required attachments, and the key quantitative thresholds (insurance cap, casualty-risk, PMD-timeline, disposal-reliability) for the chosen jurisdiction. Compose the actual draft in your reply using the scaffold + the operator's mission profile.

Use when the user asks "draft a UK launch licence", "write an authorisation application for FR LOS", "scaffold a Genehmigungsantrag nach dem deutschen WeltraumG", "prepare a NZ OSHAA payload permit", etc.

Output is BILINGUAL where DE translations exist — the agent can render in EN, DE, or both depending on the user's language. ALL section references and quantitative thresholds carry [ATLAS-ID] citations to the underlying sources. Wrap the final draft with the legal-review disclaimer from the system prompt.

Returns isError=true when the jurisdiction has no operative national space-licensing regime (e.g. EE, HR, HU, IS, LI, LT, LV, RO, SI, SK — Atlas catalogues these as "no domestic implementation"). In that case explain to the user that they need to operate under the Outer Space Treaty Art. VI obligation flowing through alternative routes (administrative practice, bilateral arrangement, etc.) rather than a dedicated statute.`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "ISO alpha-2 jurisdiction code (e.g. 'UK', 'FR', 'DE', 'US', 'JP', 'AU', 'NZ', 'IN', 'KR', 'IT', 'BE', 'NL', 'LU', 'PT', 'ES'). Use 'EU' only when drafting against the future EU Space Act regime.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "data_provider",
            "in_orbit_services",
            "constellation_operator",
            "space_resource_operator",
          ],
          description:
            "Operator category — determines which sub-permit class is the right starting point (e.g. SLR Act Part 4 vs. Part 6 in Australia; UK SIA operator licence vs. orbital activity licence).",
        },
        mission_profile: {
          type: "string",
          description:
            "Optional one-paragraph mission profile (orbit, payload mass, debris-mitigation strategy, end-customer). Helps the scaffold flag jurisdiction-specific risk areas (e.g. 5-year PMD applicability, casualty-risk threshold).",
        },
      },
      required: ["jurisdiction", "operator_type"],
    },
  },

  {
    name: "draft_compliance_brief",
    description: `Builds a structured scaffold for a multi-jurisdictional compliance brief / client memo. Returns the topic's regulatory map (which sources govern, in which jurisdictions), enforcement context (any cases that have applied these sources), per-jurisdiction key-points table, suggested brief structure (Executive Summary, Legal Framework, Risks, Recommendations), and the open questions the user should answer before the brief can be finalised.

Use when the user asks "draft a memo on 5-year LEO PMD compliance for our LEO constellation", "compliance brief on ITAR transfers between US and France", "advise on NIS2 ground-segment obligations across DE/FR/IT", "prepare client memo on debris-mitigation across our footprint", etc.

The scaffold is BILINGUAL where DE translations exist. Every cited authority/source/case in the scaffold uses ATLAS-ID/CASE-ID format so the final draft renders with hover-preview pills. Wrap the user-facing memo with the legal-review disclaimer from the system prompt.`,
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Free-text compliance topic (e.g. '5-year LEO post-mission disposal', 'ITAR Cat. XV transfers to French JV partner', 'NIS2 obligations for satellite ground segment', 'Liability Convention exposure for collision in LEO'). 5-200 chars.",
        },
        jurisdictions: {
          type: "array",
          items: { type: "string" },
          description:
            "ISO alpha-2 jurisdictions (or 'INT'/'EU') to scope the brief. Empty array = global scope (top-7 most-relevant jurisdictions for the topic).",
        },
        operator_context: {
          type: "string",
          description:
            "Optional one-paragraph context about the client operator (HQ, fleet profile, key counterparties). Lets the scaffold flag which provisions are most likely binding.",
        },
      },
      required: ["topic"],
    },
  },

  {
    name: "compare_jurisdictions_for_filing",
    description: `Generates a structured comparison matrix across jurisdictions for a chosen set of regulatory criteria — to help operators decide where to file or which JV partner to choose. Returns a per-jurisdiction × per-criterion grid with quantitative values (insurance cap, casualty-risk, PMD timeline, indemnification regime, disposal-reliability target, processing time, ITU-coordination support) and the ATLAS-ID source backing each cell.

Use when the user asks "compare UK vs. France vs. Germany for satellite licensing", "where's the best jurisdiction for a small LEO Earth-observation constellation", "which European spaceport has the cheapest indemnification regime", etc.

Returns the comparison as a structured payload the agent renders as a markdown table in the chat. Caveats and unknowns are flagged explicitly so lawyers don't infer presence-of-data from absence-of-warning. Wrap the final comparison with the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        candidate_jurisdictions: {
          type: "array",
          items: { type: "string" },
          description:
            "ISO alpha-2 jurisdictions to compare. Empty array = the eight most-active commercial-space jurisdictions (US, UK, FR, DE, IT, NL, AU, NZ).",
        },
        criteria: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "insurance_cap",
              "casualty_risk_threshold",
              "pmd_timeline",
              "disposal_reliability",
              "indemnification_regime",
              "processing_time",
              "itu_coordination_support",
              "debris_mitigation_baseline",
              "fdi_screening",
              "data_protection_regime",
            ],
          },
          description:
            "Comparison axes. Empty array = a sensible default set (insurance_cap, casualty_risk_threshold, pmd_timeline, indemnification_regime, debris_mitigation_baseline). Each criterion maps onto specific source provisions; cells without data are marked as 'no data' rather than left blank.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "in_orbit_services",
            "constellation_operator",
          ],
          description:
            "Optional. Operator category — narrows the comparison to the rules that actually bite for this operator class.",
        },
      },
    },
  },

  {
    name: "summarize_changes_since",
    description: `Returns regulatory changes that have occurred since a given date. Three buckets: (a) amendments to legal sources (statute changes, regulation revisions), (b) lifecycle events (regulations entering force, transition windows starting, supersession), and (c) regulatory-feed updates (admin-published AtlasUpdate entries — official notices, market guidance, enforcement signals).

Use when the user asks ANY "what's changed" question — "what's new since my last visit?", "any updates on UK SIA in the last 6 months?", "what amendments hit the EU Space Act this year?", "summarize this quarter's regulatory developments". The agent supplies the 'since' date based on conversational context (date the user mentions, "last week" → 7 days ago, "last quarter" → 90 days ago, etc.).

Returns ISO-dated entries grouped by source/jurisdiction with [ATLAS-…] citations. Render as a chronologically-sorted list grouped by month, NOT a generic table.`,
    input_schema: {
      type: "object",
      properties: {
        since: {
          type: "string",
          description:
            "ISO-8601 date (YYYY-MM-DD) — the cutoff. Returns events strictly after this date. REQUIRED. The agent should infer this from the user's question (e.g. 'since my last visit on March 1' → 2026-03-01; 'last 30 days' → today minus 30).",
        },
        jurisdiction: {
          type: "string",
          description:
            "Optional. ISO alpha-2 jurisdiction (DE, FR, UK, US, EU, INT) — narrows results to amendments and updates targeting this jurisdiction.",
        },
        source_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional. Specific ATLAS source IDs to scope the delta to (e.g. ['UK-SIA-2018', 'EU-NIS2-2022']). When supplied, returns ONLY changes affecting these sources.",
        },
      },
      required: ["since"],
    },
  },

  {
    name: "get_filing_deadlines",
    description: `Returns upcoming regulatory filing windows + recurring deadlines an operator must hit. Three buckets: (a) recurring deadlines (annual reports, quarterly data submissions, ITU filings), (b) launch-anchored windows (X days before / after launch), (c) regulatory-lifecycle events (EU Space Act effective dates, FCC rule changes, transition windows).

Use when the user asks "I'm filing in Germany next month, what should I prepare?", "when is the next EU Space Act milestone?", "what deadlines apply to a constellation operator?", or "what's coming up in the next 90 days?".

Returns a structured list with: title, regulatory reference, due-date semantics (annual/launch-relative/one-time), priority (CRITICAL/HIGH/MEDIUM), penalty info if known, and the ATLAS-ID anchoring the deadline to its source. Filter inputs are optional — empty inputs return the global view.

The agent should render this as a chronologically-sorted list, not a generic table. Wrap the final answer with the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: {
          type: "string",
          description:
            "Optional. ISO alpha-2 jurisdiction code (DE, FR, UK, US, INT, EU). When supplied, narrows results to deadlines that target this jurisdiction. Otherwise returns multi-jurisdictional + INT/EU deadlines.",
        },
        operator_type: {
          type: "string",
          enum: [
            "satellite_operator",
            "launch_provider",
            "ground_segment",
            "in_orbit_services",
            "constellation_operator",
            "earth_observation",
          ],
          description:
            "Optional. Operator category — drops deadlines that don't apply to this class (e.g. ITU filings irrelevant for ground-segment-only).",
        },
        horizon_days: {
          type: "number",
          description:
            "Optional. Time-window in days from today. Default 365 (one year ahead). Use 90 for the partner's 'what's coming up next quarter' question; 30 for 'what's urgent this month'.",
          minimum: 7,
          maximum: 1825,
        },
      },
    },
  },

  {
    name: "search_mandate_vault",
    description: `Durchsucht die Vault-Files des aktuell angehängten Mandats nach semantischer Ähnlichkeit zur Query (RAG). Nur verfügbar wenn Chat einem Mandat zugewiesen ist — die chat-engine filtert dieses Tool raus wenn kein Mandat attached ist.

Returns up to \`limit\` Treffer (default 5, max 10). Jeder Treffer enthält: \`fileId\` (für Citation-Link), \`filename\`, \`text\` (der relevante Chunk), \`score\` (cosine 0..1), und \`chunkIndex/totalChunks\` für Quellenangabe.

Use cases:
 - "Was steht im Schriftsatz vom 12.3. zur Frequenzkoordination?"
 - "Find die Stelle im BNetzA-Bescheid wo die Widerspruchsfrist genannt wird"
 - "Welche Files erwähnen den Antrag XY?"

Cite sources in your reply with markdown links: \`[Mandats-Datei: filename.pdf](/atlas/mandate/<mandateId>/vault/<fileId>)\`. The chat-view renders these as clickable file references.`,
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query — was suchst du im Vault? Mind. 3 Zeichen.",
        },
        limit: {
          type: "integer",
          description: "Max number of chunks to return (default 5, max 10).",
          default: 5,
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },

  /* ── Sprint 12 (2026-05-17): Chat-native Document Drafting ───────────
   * 5 tools that turn natural-language requests like "Schreib mir ne
   * Vollmacht für OrbitCo" or "Antrag an BNetzA für Frequenz" into
   * structured document scaffolds the AI uses to compose the actual
   * Word-ready document IN ITS CHAT REPLY.
   *
   * Each tool auto-loads mandate context (parties, jurisdiction,
   * primary authority, custom instructions) when a mandateId is
   * attached to the chat, so the lawyer doesn't have to repeat
   * Mandanten-Daten every time.
   *
   * All draft tools return a SCAFFOLD payload, not a finished
   * document — the AI uses the scaffold + the citations it picked
   * to write the actual prose. Output goes into the chat as Markdown
   * which the lawyer can download via the per-table PDF buttons
   * (existing) or copy-paste into Word.
   *
   * HARD RULE: every draft must include the legal-review disclaimer
   * + the PRIVILEGED & CONFIDENTIAL marker for Schriftsatz / Verträge.
   * ────────────────────────────────────────────────────────────────── */
  {
    name: "draft_schriftsatz",
    description: `Builds a German-legal-style "Schriftsatz" scaffold (brief to an authority or court) using the current mandate's parties, jurisdiction, and primary authority. Returns the recommended structure (Briefkopf · Empfänger · Aktenzeichen · Bezug · Anrede · Sachverhalt · Anträge · Begründung · Schluss · Unterschrift), the parties block auto-filled from AtlasMandateParty rows, the today date, and bilingual section-headers when the matter is cross-border.

USE WHEN the user asks: "schreib mir nen Antrag an BNetzA", "Schriftsatz an das VG Köln für OrbitCo", "Beschwerde gegen Bescheid X", "Stellungnahme zum Bescheid vom 12.4."

After calling: write the actual Schriftsatz in your reply, using the scaffold sections. Apply the lawyer's custom instructions if any. Cite every regulatory claim with [ATLAS:...] tokens. Begin output with "PRIVILEGED & CONFIDENTIAL" and the legal-review disclaimer.`,
    input_schema: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description:
            "Empfänger of the Schriftsatz — full authority/court name (z.B. 'Bundesnetzagentur', 'Verwaltungsgericht Köln'). When omitted, the tool uses the mandate's primaryAuthority.",
        },
        subject: {
          type: "string",
          description:
            "Subject-line / Bezug ('Antrag auf Frequenzzuteilung S-Band für Mission OrbitSat-1'). 5-200 chars.",
        },
        purpose: {
          type: "string",
          enum: [
            "antrag",
            "stellungnahme",
            "beschwerde",
            "klage",
            "widerspruch",
            "anhoerung",
            "sonstiges",
          ],
          description:
            "Schriftsatz-Typ. 'antrag' = Genehmigungs/Zulassungs-Antrag, 'stellungnahme' = Reply zu Anhörung, 'beschwerde' = formal complaint, 'klage' = Klageschrift, 'widerspruch' = Widerspruch gegen Bescheid, 'anhoerung' = Anhörung response.",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional 1-5 key arguments / Anträge the lawyer wants in the brief. The AI uses these as the spine of the Begründung section.",
        },
      },
      required: ["subject", "purpose"],
    },
  },

  {
    name: "draft_mandantenbrief",
    description: `Builds a client-letter scaffold (Brief an Mandant). Returns the recipient-block from the mandate's clientName + clientContact (or AtlasMandateParty of type='client'), today's date, suitable salutation, and the section-skeleton appropriate to the letter-kind (Mandatsbestätigung / Sachstandsbericht / Erstberatungs-Memo / Honorarnote-Begleitschreiben / Schlusssbericht).

USE WHEN the user asks: "schreib dem Mandanten X einen Sachstandsbericht", "Mandatsbestätigung für OrbitCo aufsetzen", "Memo zur Erstberatung am 5.5.", "Begleitschreiben zur Honorarnote".

After calling: write the actual letter in your reply with appropriate Anrede ("Sehr geehrte Frau Geschäftsführerin", "Lieber Herr Müller" only if signaled), formal-but-warm tone for Sachstandsbericht, factual-only for Bestätigung. End with the lawyer's salutation block.`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "mandatsbestaetigung",
            "sachstandsbericht",
            "erstberatung_memo",
            "schlussbericht",
            "honorarnote_begleitschreiben",
            "sonstiges",
          ],
          description:
            "Brief-Typ. Each kind has distinct section-skeleton + tone.",
        },
        subject: {
          type: "string",
          description:
            "Betreff / Bezug ('Sachstand Genehmigungsverfahren KW 18-2026'). 5-200 chars.",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional 1-5 facts/topics the lawyer wants covered (z.B. 'Frist bei BNetzA: 30.5.', 'Anhörungstermin: 12.6.', 'Risikoeinschätzung neuer Bescheid').",
        },
        tone: {
          type: "string",
          enum: ["formal", "warm", "neutral"],
          description:
            "Tone — 'formal' (Erstkontakt), 'warm' (etablierter Mandant), 'neutral' (default).",
        },
      },
      required: ["kind", "subject"],
    },
  },

  {
    name: "draft_vertrag",
    description: `Builds a contract scaffold (Vollmacht / Mandatsvereinbarung / NDA / Kooperationsvereinbarung / sonstige) for one of the parties in the current mandate. Returns the parties block, jurisdiction-appropriate boilerplate (German RVG-konforme Mandatsvereinbarung; AGB-Anlehnung), the suggested clause-spine, and standard salvatorische Klausel + Gerichtsstand.

USE WHEN the user asks: "Vollmacht für OrbitCo erstellen", "Mandatsvereinbarung mit neuem Mandanten", "NDA für Frequenz-Daten mit BNetzA", "Kooperationsvereinbarung Co-Counsel KanzleiX".

After calling: write the actual contract draft. Use {{Token}}-style placeholders only for variables the tool didn't auto-resolve (e.g. {{Honorarsatz EUR/h}}). Include "PRIVILEGED & CONFIDENTIAL" + the legal-review disclaimer at the top.`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "vollmacht",
            "mandatsvereinbarung",
            "nda",
            "kooperationsvereinbarung",
            "honorarvereinbarung",
            "sonstiges",
          ],
          description: "Vertrags-Typ.",
        },
        counterparty_party_id: {
          type: "string",
          description:
            "Optional AtlasMandateParty.id of the contract-counterparty. When provided, the tool auto-fills the parties block from that party's name/address/contact. Otherwise the AI infers from chat context.",
        },
        scope: {
          type: "string",
          description:
            "Free-text Spezial-Scope (z.B. 'beschränkt auf die Vertretung vor BNetzA in der Sache Frequenzzuteilung S-Band'). 5-500 chars.",
        },
      },
      required: ["kind"],
    },
  },

  {
    name: "draft_aktennotiz",
    description: `Builds an internal note scaffold (Aktennotiz / Telefon-Vermerk / Memo / Beratungsprotokoll). Returns the standard structure: Datum, Uhrzeit, Teilnehmer, Anlass, Inhalt, Vereinbarungen, Nächste Schritte. Picks up mandate parties + current lawyer as default Teilnehmer.

USE WHEN the user asks: "schreib mal nen Telefonvermerk zum Gespräch mit Anna Lee", "Aktennotiz zur heutigen Besprechung", "Memo zur Recherche zu §22 NIS2", "Beratungsprotokoll Erstberatung OrbitCo 5.5.".

After calling: write the actual note in your reply. Aktennotiz tone is FACTUAL + KNAPP — no formal salutation, no closing. Numbered subsections OK. Optional: short conclusion block ("Bewertung:" oder "Risikoeinschätzung:").`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "telefon_vermerk",
            "besprechungs_protokoll",
            "memo",
            "beratungs_protokoll",
            "recherche_memo",
            "sonstiges",
          ],
          description: "Notiz-Typ.",
        },
        subject: {
          type: "string",
          description:
            "Anlass / Betreff ('Telefonat Anna Lee zu Frequenz-Antrag', 'Recherche §22 NIS2 Anwendbarkeit auf Bodenstationen').",
        },
        participants: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of Teilnehmer (Name + ggf. Funktion). When omitted, the lawyer + the mandate's primary client are used.",
        },
      },
      required: ["kind", "subject"],
    },
  },

  /* Sprint 12 C — Letterhead via Chat: get_org_branding +
     set_org_branding now live in `branding-tools.server.ts` (Atlas V3
     T0.1 bundle-split, 2026-05-26). They get merged into ATLAS_TOOLS
     below via the BRANDING_TOOLS spread. */

  /* ── Sprint 12 D — Document Templates as Chat-Memory ────────────────
   * Three tools that let the kanzlei build a personal template library
   * via natural-language chat — no Templates-Page UI. The lawyer
   * iterates on a draft, then says "speicher das als Template ..." →
   * the AI calls save_document_template. Later: "nutz Template X für
   * Mandant Y" → use_document_template merges + returns ready-to-polish.
   * ───────────────────────────────────────────────────────────── */
  {
    name: "save_document_template",
    description: `Saves the current document draft (from the AI's most recent reply) as a reusable template in the kanzlei's library. Extracts mandate-specific values from the body and replaces them with {{token}} placeholders for future merging.

USE WHEN the lawyer says: "speicher das als Template 'BNetzA-Standardantrag'", "merk dir die Vollmacht als Vorlage 'Frequenz-Vollmacht'".

Auto-detects + tokenizes these mandate-specific values:
- {{client_name}} from the current mandate's client party
- {{today}} from the date in the draft
- {{aktenzeichen}} from client party reference
- {{authority}} from mandate.primaryAuthority

The lawyer can review tokens before save by passing dry_run=true.`,
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Template-Name (eindeutig pro Kanzlei). 3-100 chars. Beispiele: 'BNetzA-Standardantrag', 'Erstberatungs-Memo', 'Vollmacht-Frequenzrecht'.",
        },
        kind: {
          type: "string",
          enum: ["schriftsatz", "brief", "vertrag", "aktennotiz", "sonstiges"],
          description: "Template-Typ — matches draft-tool kind.",
        },
        body: {
          type: "string",
          description:
            "Vollständiger Markdown-Body des Drafts. Die AI fügt {{tokens}} ein, basierend auf den extrahierten mandate-spezifischen Werten.",
        },
        dry_run: {
          type: "boolean",
          description:
            "Wenn true: tokenisiert + zeigt Lawyer das Template-Preview ohne zu speichern. Default false.",
        },
      },
      required: ["name", "kind", "body"],
    },
  },
  {
    name: "list_document_templates",
    description: `Returns all document templates in the kanzlei's library, optionally filtered by kind. The AI uses this when the lawyer asks "welche Templates haben wir?" or "zeig mir alle Schriftsatz-Templates".

Returns each template's id, name, kind, token-count, last-update — the AI then renders as a plain Markdown list/table.`,
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["schriftsatz", "brief", "vertrag", "aktennotiz", "sonstiges"],
          description:
            "Optional Filter — nur Templates dieses Typs zurückgeben.",
        },
      },
    },
  },
  {
    name: "use_document_template",
    description: `Loads a template by name (or id) and merges its {{tokens}} with the current mandate's data. Returns the merged body — the AI uses it as a starting point and lightly polishes (mandate-specific details, today's exact wording, jurisdiction-specific phrasing).

USE WHEN the lawyer says: "nutz BNetzA-Standardantrag für SkyCorp", "nimm Template Vollmacht-Frequenzrecht", "die Standard-Erstberatungs-Memo aber für Mandant XYZ".

After calling: present the merged body to the lawyer + lightly polish based on chat context. Don't blindly emit — apply any specifics from the lawyer's request.`,
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Template-Name (case-insensitive). Wenn nicht eindeutig → AI fragt zurück mit list_document_templates.",
        },
        id: {
          type: "string",
          description:
            "Optional Template-ID (cuid). Wenn name UND id leer → Fehler.",
        },
      },
    },
  },

  {
    name: "refine_document",
    description: `Takes an existing draft (Schriftsatz / Brief / Vertrag / Aktennotiz) the user is iterating on and produces refinement guidance for the AI to rewrite a specific section or aspect. Returns: which section to focus on, what aspect to change, suggested register (formaler/lockerer/kürzer/präziser), and any cross-references to mandate-data or citations that should be added.

USE WHEN the user says: "Begründung kürzer", "nochmal förmlicher", "Absatz 3 anders formulieren", "füg §22 NIS2 hinzu", "der Tonfall ist zu freundlich", "verkürz das auf eine Seite".

After calling: rewrite ONLY the requested section/aspect in your reply, NOT the whole document. Keep the rest implicitly unchanged. Output the new section block ready-to-paste.`,
    input_schema: {
      type: "object",
      properties: {
        target_section: {
          type: "string",
          description:
            "Which section to refine ('Begründung', 'Anrede', 'Anträge', 'Sachverhalt', 'gesamt'). 'gesamt' = entire document.",
        },
        change_kind: {
          type: "string",
          enum: [
            "kuerzer",
            "laenger",
            "formaler",
            "lockerer",
            "praeziser",
            "andere_formulierung",
            "zitat_hinzufuegen",
            "fakt_korrigieren",
            "sonstiges",
          ],
          description: "Art der Änderung.",
        },
        instruction: {
          type: "string",
          description:
            "Free-text spezifische Anweisung vom Anwalt ('halb so lang', 'mehr §-Bezüge', 'füg §22 NIS2 ein', 'der Mandant hieß Anna Lee nicht Hans Müller').",
        },
      },
      required: ["target_section", "change_kind", "instruction"],
    },
  },
];

/* Sprint D2 — agent-mode-only orchestration tools. Not used by chat-
   mode (the executor in atlas-tool-executor.ts has no handler; agent
   route special-cases them BEFORE delegating to the executor). The
   model is told about them via the agent system-prompt + the tool
   description below. */
const AGENT_ORCHESTRATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "delegate_subtasks",
    description: `Sprint D2 — Fires K parallel sub-agents (max 4) to do genuinely-parallel work. Each sub-agent is single-completion (NO tool-use): it gets a self-contained prompt + lawyer-context and returns Markdown text. Results come back concatenated as \`## <title>\` sections so you can navigate them.

USE THIS WHEN:
 - "Compare X across N jurisdictions" — fire 1 sub-agent per jurisdiction
 - "Analyse N independent contract sections" — fire 1 sub-agent per section
 - "Recherchiere Argumentation für 3 verschiedene Hypothesen" — fire 1 per hypothesis

DO NOT use for:
 - Sequential dependencies (sub-agent B needs sub-agent A's output) — chain them in your own plan instead
 - Single-task work (just do it inline; delegation has overhead)
 - Anything requiring tool-use (sub-agents have no tools)

Each sub-task prompt MUST be self-contained — embed any mandate context, jurisdiction, or facts the sub-agent needs. Sub-agents see ONLY their own prompt, not your conversation.

Cost: K parallel Claude completions, max 1500 tokens each. Real wall-clock speedup ≈ K× for IO-bound work. Don't dispatch unless you'd genuinely save sequential turns.`,
    input_schema: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          description:
            "Array of 1-4 sub-task specs. Each must have non-empty title (max 200 chars) + a self-contained prompt (≥10 chars, max 4000 chars).",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description:
                  "Short label for the sub-task (e.g. 'Frankreich — Authorisierung', 'Sec 3.2 — Haftungsklausel').",
              },
              prompt: {
                type: "string",
                description:
                  "Self-contained prompt the sub-agent will receive. Embed any context the sub-agent needs — it has no conversation history.",
              },
            },
            required: ["title", "prompt"],
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ["subtasks"],
    },
  },
];

/* Atlas V2 Sprint 3-5 + V3 T0.1: tool bundles merged into the
   canonical ATLAS_TOOLS array so the chat-engine picks them up
   automatically.
   - Sprint 3: 8 compliance tools (compliance-tools.server.ts)
   - Sprint 4: 3 validity tools (validity-tools.server.ts)
   - Sprint 5: 5 document tools (document-tools.server.ts)
   - V3 T0.1: 2 branding tools (branding-tools.server.ts) */
export const ATLAS_TOOLS: Anthropic.Tool[] = [
  ...CORE_ATLAS_TOOLS,
  ...COMPLIANCE_TOOLS,
  ...VALIDITY_TOOLS,
  ...DOCUMENT_TOOLS,
  ...BRANDING_TOOLS,
  /* Sprint D2 — orchestration tools (agent-mode special-case). */
  ...AGENT_ORCHESTRATION_TOOLS,
];

/* Core (Sprint 1) tool-name union. Compliance tool names are matched at
   runtime via isComplianceToolName(); we intentionally don't enumerate
   them in the AtlasToolName literal-union to keep this file stable as
   the compliance-tools file grows. */
export type AtlasToolName =
  | "find_or_open_matter"
  | "find_operator_organization"
  | "create_matter_invite"
  | "create_solo_matter"
  | "search_legal_sources"
  | "get_legal_source_by_id"
  | "list_workspace_templates"
  | "list_jurisdiction_authorities"
  | "search_cases"
  | "get_case_by_id"
  | "draft_authorization_application"
  | "draft_compliance_brief"
  | "compare_jurisdictions_for_filing"
  | "get_filing_deadlines"
  | "summarize_changes_since"
  /* Sprint 12 — chat-native document drafting. */
  | "draft_schriftsatz"
  | "draft_mandantenbrief"
  | "draft_vertrag"
  | "draft_aktennotiz"
  | "refine_document"
  /* Sprint 12 C — letterhead via chat. Now lives in branding-tools.server.ts
     (Atlas V3 T0.1 bundle-split). Names resolved at runtime via
     isBrandingToolName() in atlas-tool-executor.ts, like the
     compliance/validity/document bundles. */
  /* Sprint 12 D — document templates as chat-memory. */
  | "save_document_template"
  | "list_document_templates"
  | "use_document_template"
  /* Sprint D2 — agent-mode orchestration. Resolved by the agent
     route's special-case path, NOT by atlas-tool-executor. */
  | "delegate_subtasks";

export function isAtlasToolName(name: string): boolean {
  return ATLAS_TOOLS.some((t) => t.name === name);
}
