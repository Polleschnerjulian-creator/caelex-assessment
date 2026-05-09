/**
 * Atlas Drafting Chat — tool definitions (Bundle 44).
 *
 * The shape Anthropic expects for tool_use. Two categories:
 *   - Server tools: run inside the engine, do real work (LLM call to
 *     generate a draft body, parse a mandant email into intake JSON).
 *   - Client tools: the engine packages them as ClientAction records
 *     and returns them to the browser, which mutates its localStorage
 *     stores. The engine still ack-replies to Anthropic so the chat
 *     loop continues.
 *
 * Browser state (mandates, workspaces, clauses) is NOT exposed as
 * read-tools — it's already in the system prompt as JSON context, so
 * the LLM can reference it directly. Tools are write-only.
 *
 * Adding a new tool is a 3-step ritual: define it here, implement /
 * route in tool-executor.server.ts, optionally extend ClientAction
 * union in types.ts.
 */

/** Anthropic SDK's tool schema shape. */
export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Tag every tool with which side runs it — engine uses this to route. */
export const SERVER_TOOL_NAMES = [
  "generate_draft",
  "extract_mandate_facts",
] as const;

export const CLIENT_TOOL_NAMES = [
  "set_active_mandate",
  "create_mandate",
  "update_mandate",
  "delete_mandate",
  "instantiate_plan",
  "set_plan_item_body",
  "accept_plan_item",
  "skip_plan_item",
  "attach_clause_to_session",
  "detach_clause_from_session",
  "push_to_library",
] as const;

export type ServerToolName = (typeof SERVER_TOOL_NAMES)[number];
export type ClientToolName = (typeof CLIENT_TOOL_NAMES)[number];

export function isServerTool(name: string): name is ServerToolName {
  return (SERVER_TOOL_NAMES as readonly string[]).includes(name);
}
export function isClientTool(name: string): name is ClientToolName {
  return (CLIENT_TOOL_NAMES as readonly string[]).includes(name);
}

/* ── The catalog ──────────────────────────────────────────────────── */

export const DRAFTING_CHAT_TOOLS: AnthropicToolDefinition[] = [
  /* ── Server tools ─────────────────────────────────────────────── */
  {
    name: "generate_draft",
    description:
      "Generates the actual body of a draft document by calling the Atlas drafting prompt-builders + Anthropic. Returns the generated body text. Use this whenever the user asks for a specific draft (auth, brief, compare, NDA, cover letter). The active mandate's intake (and attached clauses) are auto-injected — you don't need to repeat them in the args. After generation, also call set_plan_item_body or push_to_library so the result lands somewhere persistent.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["auth", "brief", "compare", "nda", "cover"],
          description: "Which draft kind. Each maps to a prompt-builder.",
        },
        args: {
          type: "object",
          description:
            "Builder args matching the kind. For auth: {jurisdiction, operatorType, mission?, authorityId?}. For brief: {topic}. For compare: {jurisdictions: string[]}. For nda: {ndaType: 'mutual'|'one_way', partyA, partyB, jurisdiction, termYears}. For cover: {filingType: 'authorization'|'notification'|'renewal'|'amendment', authority, reference?, authorityId?}. Mission, partyA, etc. can be left blank — the engine fills from the active mandate's intake.",
        },
        useMandateContext: {
          type: "boolean",
          description:
            "Whether to inject the active mandate's intake context into the prompt (Mandate context: ... line). Defaults to true.",
        },
        useAttachedClauses: {
          type: "boolean",
          description:
            "Whether to append the verbatim-include directive for any clauses attached to the session. Defaults to true.",
        },
      },
      required: ["kind", "args"],
    },
  },
  {
    name: "extract_mandate_facts",
    description:
      "Parses a free-text client email and extracts mandate-intake fields (client name, jurisdiction, operator type, satellite specs, mission profile, frequencies, launch date) as a JSON object. Use this when the user pastes a client communication and asks to onboard the mandate. Combine with create_mandate or update_mandate to actually persist the result.",
    input_schema: {
      type: "object",
      properties: {
        emailBody: {
          type: "string",
          description: "Raw email text to parse.",
        },
      },
      required: ["emailBody"],
    },
  },

  /* ── Client tools (state mutations) ───────────────────────────── */
  {
    name: "set_active_mandate",
    description:
      "Switches the active mandate. Subsequent draft generations will pull intake context from the new active mandate. Use when the user names a different mandate ('switch to Aero-Partners', 'use Sky-Sat for the next draft').",
    input_schema: {
      type: "object",
      properties: {
        mandateId: {
          type: "string",
          description: "Mandate id from the BrowserContext.mandates list.",
        },
      },
      required: ["mandateId"],
    },
  },
  {
    name: "create_mandate",
    description:
      "Creates a new mandate. Use when the user describes a client that isn't in BrowserContext.mandates yet. Optionally pass an intake (full or partial) to seed it. If makeActive=true (default), also switches active mandate to the new one.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Display name. Defaults to the client field if intake is provided.",
        },
        intake: {
          type: "object",
          description:
            "Partial MandateIntake fields (client, primaryJurisdiction, operatorType, satelliteSpecs, missionProfile, frequencies, launchDate).",
        },
        makeActive: {
          type: "boolean",
          description: "Whether to activate the new mandate. Defaults to true.",
        },
      },
    },
  },
  {
    name: "update_mandate",
    description:
      "Updates the intake or display name of an existing mandate. Use when extracting facts from email or user clarifies a field.",
    input_schema: {
      type: "object",
      properties: {
        mandateId: { type: "string" },
        name: { type: "string" },
        intake: {
          type: "object",
          description: "Partial MandateIntake fields to merge.",
        },
      },
      required: ["mandateId"],
    },
  },
  {
    name: "delete_mandate",
    description:
      "Deletes a mandate. Use sparingly — confirm with user first if at all uncertain.",
    input_schema: {
      type: "object",
      properties: {
        mandateId: { type: "string" },
      },
      required: ["mandateId"],
    },
  },
  {
    name: "instantiate_plan",
    description:
      "Creates a plan workspace for the given plan template + mandate. Use when the user asks for a paket ('full DE filing', 'NIS2 onboarding bundle'). Plan ids are: de-full-authorization, fr-full-authorization, itu-frequency-filing, nis2-onboarding, investor-dd. Returns the workspace id which subsequent set_plan_item_body / accept_plan_item calls reference.",
    input_schema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        mandateId: {
          type: "string",
          description:
            "Mandate id, or null for an unbound workspace. Defaults to the active mandate.",
        },
        outputLang: { type: "string", enum: ["de", "en"] },
      },
      required: ["planId"],
    },
  },
  {
    name: "set_plan_item_body",
    description:
      "Writes a generated body into a plan-workspace item, marking it as 'generated' (not yet accepted). Pair with generate_draft: first generate, then write the result here. Status defaults to 'generated' — pass 'accepted' to skip the manual accept step.",
    input_schema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
        itemId: { type: "string" },
        body: { type: "string" },
        status: { type: "string", enum: ["generated", "accepted"] },
      },
      required: ["workspaceId", "itemId", "body"],
    },
  },
  {
    name: "accept_plan_item",
    description: "Marks a plan-workspace item as accepted (locks the body).",
    input_schema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
        itemId: { type: "string" },
      },
      required: ["workspaceId", "itemId"],
    },
  },
  {
    name: "skip_plan_item",
    description:
      "Marks a plan-workspace item as skipped (omitted from the export).",
    input_schema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
        itemId: { type: "string" },
      },
      required: ["workspaceId", "itemId"],
    },
  },
  {
    name: "attach_clause_to_session",
    description:
      "Attaches a saved clause to the session so subsequent generate_draft calls include it verbatim.",
    input_schema: {
      type: "object",
      properties: {
        clauseId: { type: "string" },
      },
      required: ["clauseId"],
    },
  },
  {
    name: "detach_clause_from_session",
    description: "Detaches a clause from the session.",
    input_schema: {
      type: "object",
      properties: {
        clauseId: { type: "string" },
      },
      required: ["clauseId"],
    },
  },
  {
    name: "push_to_library",
    description:
      "Archives a one-off draft (not part of a plan workspace) into the My Drafts library. Use when generate_draft was called outside a plan context.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["auth", "brief", "compare", "nda", "cover"],
        },
        title: { type: "string" },
        prompt: { type: "string" },
        body: { type: "string" },
        outputLocale: { type: "string" },
        privileged: { type: "boolean" },
      },
      required: ["kind", "title", "prompt", "outputLocale"],
    },
  },
];
