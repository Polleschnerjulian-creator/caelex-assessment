import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Templates Tools (T0.1.c bundle-split, 2026-05-26).
 *
 * Four tools covering the kanzlei's template library, mixing two
 * different kinds of templates:
 *
 *   1. WORKSPACE templates (`list_workspace_templates`) — pre-seeded
 *      Pinboards (DE Satelliten-Lizenz, NIS2-Compliance, etc.) from
 *      `@/data/atlas-workspace-templates`. Static catalogue, no DB.
 *
 *   2. DOCUMENT templates (`save_document_template`,
 *      `list_document_templates`, `use_document_template`) —
 *      lawyer-built drafts saved as `AtlasDocumentTemplate` rows
 *      with auto-tokenized mandate-specific values (e.g.
 *      `{{client_name}}`, `{{authority}}`). The "chat-memory"
 *      pattern from Sprint 12 D.
 *
 * Shared dependency: `loadMandateScaffoldContext` from
 * `mandate-scaffold-context.server.ts` (extracted from the executor
 * as part of this T0.1.c work).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listTemplateSummaries } from "@/data/atlas-workspace-templates";
import {
  loadMandateScaffoldContext,
  type MandateScaffoldContext,
} from "./mandate-scaffold-context.server";

/* ── Result type ────────────────────────────────────────────────────── */

export interface TemplatesToolResult {
  content: string;
  isError: boolean;
}

/* ── Tool definitions ───────────────────────────────────────────────── */

export const TEMPLATES_TOOLS: Anthropic.Tool[] = [
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
];

const TEMPLATES_TOOL_NAMES = TEMPLATES_TOOLS.map((t) => t.name) as string[];

export function isTemplatesToolName(name: string): boolean {
  return TEMPLATES_TOOL_NAMES.includes(name);
}

/* ── Tool execution ─────────────────────────────────────────────────── */

function listWorkspaceTemplates(): TemplatesToolResult {
  const summaries = listTemplateSummaries();
  return {
    content: JSON.stringify({
      template_count: summaries.length,
      templates: summaries,
      hint: "Recommend the best-fit template by id. The user clicks it in the UI to seed a new workspace pre-loaded with the relevant Atlas sources.",
    }),
    isError: false,
  };
}

const SaveDocumentTemplateInput = z.object({
  name: z.string().trim().min(3).max(100),
  kind: z.enum(["schriftsatz", "brief", "vertrag", "aktennotiz", "sonstiges"]),
  body: z.string().min(20).max(50_000),
  dry_run: z.boolean().optional(),
});

/* Token-extraction: find common mandate-specific values in the body
   and replace them with {{token}} placeholders. */
function tokenizeBody(
  body: string,
  ctx: MandateScaffoldContext | null,
): { tokenized: string; tokens: string[] } {
  if (!ctx) return { tokenized: body, tokens: [] };
  let out = body;
  const tokens: string[] = [];
  const replacements: { value: string | null; token: string }[] = [
    { value: ctx.clientName, token: "client_name" },
    { value: ctx.clientContact, token: "client_contact" },
    { value: ctx.primaryAuthority, token: "authority" },
    { value: ctx.jurisdiction, token: "jurisdiction" },
    { value: ctx.operatorType, token: "operator_type" },
    ...ctx.parties.flatMap((p) => [
      { value: p.name, token: `party_${p.type}_name` },
      { value: p.reference, token: `party_${p.type}_reference` },
      { value: p.contact, token: `party_${p.type}_contact` },
      { value: p.address, token: `party_${p.type}_address` },
    ]),
    { value: ctx.ownerName, token: "lawyer_name" },
    { value: ctx.ownerEmail, token: "lawyer_email" },
  ];
  /* M12: substitute longer values first so a short value (e.g. client
     "Spire") that is a substring of a longer one (e.g. party "Spire
     Global") can't corrupt the longer match order-dependently. */
  const ordered = [...replacements].sort(
    (a, b) => (b.value?.length ?? 0) - (a.value?.length ?? 0),
  );
  for (const { value, token } of ordered) {
    if (value && value.length >= 3) {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "g");
      if (re.test(out)) {
        out = out.replace(re, `{{${token}}}`);
        if (!tokens.includes(token)) tokens.push(token);
      }
    }
  }
  return { tokenized: out, tokens };
}

async function saveDocumentTemplate(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<TemplatesToolResult> {
  const parsed = SaveDocumentTemplateInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const d = parsed.data;
  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });
  const { tokenized, tokens } = tokenizeBody(d.body, ctx);

  if (d.dry_run) {
    return {
      content: JSON.stringify({
        dry_run: true,
        name: d.name,
        kind: d.kind,
        tokens,
        tokenized_preview: tokenized.slice(0, 1000),
        directive:
          "Show the lawyer the tokens + preview. Confirm before persisting (call again without dry_run).",
      }),
      isError: false,
    };
  }

  try {
    const created = await prisma.atlasDocumentTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: args.callerOrgId,
          name: d.name,
        },
      },
      create: {
        organizationId: args.callerOrgId,
        name: d.name,
        kind: d.kind,
        body: tokenized,
        tokensJson: JSON.stringify(tokens),
        sourceMandateId: args.mandateId ?? null,
        createdByUserId: args.callerUserId,
      },
      update: {
        kind: d.kind,
        body: tokenized,
        tokensJson: JSON.stringify(tokens),
        sourceMandateId: args.mandateId ?? null,
      },
      select: { id: true, name: true, kind: true, updatedAt: true },
    });
    return {
      content: JSON.stringify({
        ok: true,
        template: created,
        tokens,
        directive: `Template '${created.name}' gespeichert (${tokens.length} Tokens). Nutzung: "nutz ${created.name} für Mandant XYZ".`,
      }),
      isError: false,
    };
  } catch (err) {
    return {
      content: JSON.stringify({
        error: "Save failed",
        details: err instanceof Error ? err.message : String(err),
      }),
      isError: true,
    };
  }
}

const ListDocumentTemplatesInput = z.object({
  kind: z
    .enum(["schriftsatz", "brief", "vertrag", "aktennotiz", "sonstiges"])
    .optional(),
});

async function listDocumentTemplates(args: {
  input: unknown;
  callerOrgId: string;
}): Promise<TemplatesToolResult> {
  const parsed = ListDocumentTemplatesInput.safeParse(args.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const templates = await prisma.atlasDocumentTemplate.findMany({
    where: {
      organizationId: args.callerOrgId,
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      tokensJson: true,
      updatedAt: true,
    },
    take: 100,
  });
  return {
    content: JSON.stringify({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        tokenCount: (() => {
          try {
            return (JSON.parse(t.tokensJson) as string[]).length;
          } catch {
            return 0;
          }
        })(),
        updatedAt: t.updatedAt,
      })),
    }),
    isError: false,
  };
}

const UseDocumentTemplateInput = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  id: z.string().cuid().optional(),
});

async function applyDocumentTemplate(args: {
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<TemplatesToolResult> {
  const parsed = UseDocumentTemplateInput.safeParse(args.input);
  if (!parsed.success || (!parsed.data.name && !parsed.data.id)) {
    return {
      content: JSON.stringify({ error: "Pass either name or id." }),
      isError: true,
    };
  }
  const template = await prisma.atlasDocumentTemplate.findFirst({
    where: {
      organizationId: args.callerOrgId,
      ...(parsed.data.id
        ? { id: parsed.data.id }
        : { name: { equals: parsed.data.name, mode: "insensitive" } }),
    },
    select: {
      id: true,
      name: true,
      kind: true,
      body: true,
      tokensJson: true,
    },
  });
  if (!template) {
    return {
      content: JSON.stringify({
        error: "Template not found",
        directive:
          "Call list_document_templates to show the lawyer what's available.",
      }),
      isError: true,
    };
  }

  const ctx = await loadMandateScaffoldContext({
    mandateId: args.mandateId,
    callerUserId: args.callerUserId,
    callerOrgId: args.callerOrgId,
  });
  let mergedBody = template.body;
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const resolved: Record<string, string> = { today };
  if (ctx) {
    if (ctx.clientName) resolved.client_name = ctx.clientName;
    if (ctx.clientContact) resolved.client_contact = ctx.clientContact;
    if (ctx.primaryAuthority) resolved.authority = ctx.primaryAuthority;
    if (ctx.jurisdiction) resolved.jurisdiction = ctx.jurisdiction;
    if (ctx.operatorType) resolved.operator_type = ctx.operatorType;
    if (ctx.ownerName) resolved.lawyer_name = ctx.ownerName;
    if (ctx.ownerEmail) resolved.lawyer_email = ctx.ownerEmail;
    for (const p of ctx.parties) {
      if (p.name) resolved[`party_${p.type}_name`] = p.name;
      if (p.reference) resolved[`party_${p.type}_reference`] = p.reference;
      if (p.contact) resolved[`party_${p.type}_contact`] = p.contact;
      if (p.address) resolved[`party_${p.type}_address`] = p.address;
    }
  }
  const tokens = (() => {
    try {
      return JSON.parse(template.tokensJson) as string[];
    } catch {
      return [];
    }
  })();
  const unresolved: string[] = [];
  for (const token of tokens) {
    const value = resolved[token];
    if (value !== undefined) {
      const re = new RegExp(`\\{\\{${token}\\}\\}`, "g");
      mergedBody = mergedBody.replace(re, value);
    } else {
      unresolved.push(token);
    }
  }
  mergedBody = mergedBody.replace(/\{\{today\}\}/g, today);

  return {
    content: JSON.stringify({
      template: { name: template.name, kind: template.kind },
      merged_body: mergedBody,
      unresolved_tokens: unresolved,
      directive:
        unresolved.length > 0
          ? `Merged body has ${unresolved.length} unresolved token(s): ${unresolved.join(", ")}. Either ask the lawyer for them or fill from chat context.`
          : "All tokens resolved. Present the merged body to the lawyer and lightly polish based on chat context.",
    }),
    isError: false,
  };
}

/** Bundle entry-point. */
export async function executeTemplatesTool(args: {
  name: string;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
  mandateId?: string | null;
}): Promise<TemplatesToolResult> {
  switch (args.name) {
    case "list_workspace_templates":
      return listWorkspaceTemplates();
    case "save_document_template":
      return saveDocumentTemplate({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    case "list_document_templates":
      return listDocumentTemplates({
        input: args.input,
        callerOrgId: args.callerOrgId,
      });
    case "use_document_template":
      return applyDocumentTemplate({
        input: args.input,
        callerUserId: args.callerUserId,
        callerOrgId: args.callerOrgId,
        mandateId: args.mandateId,
      });
    default:
      return {
        content: JSON.stringify({
          error: `Unknown templates tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
