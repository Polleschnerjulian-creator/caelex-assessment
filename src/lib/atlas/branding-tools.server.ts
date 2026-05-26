import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — Branding Tools (T0.1 bundle-split, 2026-05-26).
 *
 * Two tools that let the kanzlei manage its Briefkopf/Letterhead
 * data inline via chat. Surfaced via:
 *   - get_org_branding — read-side, returns AtlasOrgBranding row
 *   - set_org_branding — upsert-side, partial-update friendly
 *
 * Extracted from `atlas-tool-executor.ts` as part of the bundle-
 * split (T0.1 of docs/ATLAS-V3-MASTER-PLAN.md). Follows the same
 * shape as compliance-tools.server.ts / validity-tools.server.ts /
 * document-tools.server.ts:
 *   - export `BRANDING_TOOLS: Anthropic.Tool[]` for ATLAS_TOOLS
 *     aggregation
 *   - export `isBrandingToolName()` runtime guard for the
 *     dispatcher in atlas-tool-executor.ts
 *   - export `executeBrandingTool()` the bundle entry-point
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/* ── Result type ────────────────────────────────────────────────────── */

export interface BrandingToolResult {
  content: string;
  isError: boolean;
}

/* ── Tool definitions (Anthropic-tool format) ───────────────────────── */

export const BRANDING_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_org_branding",
    description: `Returns the kanzlei's stored Letterhead/Briefkopf data (name, address, phone, email, RA-Nummer, Bankverbindung, default Gerichtsstand, default Schlussformel, logo). Returns { branding: null } when not yet set — the AI uses this signal to ask the lawyer to set it via set_org_branding.

USE: at the start of any draft_schriftsatz / draft_brief / draft_vertrag flow to check whether to use stored branding or to ask the lawyer.`,
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "set_org_branding",
    description: `Upserts (creates-or-updates) the kanzlei's Letterhead/Briefkopf. ALL fields optional — pass only what changed. Existing fields are preserved if omitted. The AI calls this when the lawyer pastes branding info into the chat ("hier mein Briefkopf: ..." or in response to the lazy-onboarding prompt).

DO NOT call without explicit lawyer input — set_org_branding is per-kanzlei and changes every future draft. When uncertain, confirm with the lawyer before persisting.`,
    input_schema: {
      type: "object",
      properties: {
        letterheadName: {
          type: "string",
          description:
            "Kanzlei-Name wie auf dem Briefkopf erscheint (kann von Organization.name abweichen).",
        },
        address: {
          type: "string",
          description: "Adresse (multi-line erlaubt).",
        },
        phone: { type: "string", description: "Telefon (eine Zeile)." },
        email: { type: "string", description: "Kanzlei-E-Mail." },
        website: { type: "string", description: "Kanzlei-Website." },
        raNumber: { type: "string", description: "RA-Liste-Nummer." },
        authority: {
          type: "string",
          description: "Aufsichtsbehörde (z.B. 'Rechtsanwaltskammer Berlin').",
        },
        insuranceNote: {
          type: "string",
          description:
            "Berufshaftpflicht-Hinweis (Versicherer + Geltungsbereich).",
        },
        bankName: { type: "string", description: "Bank-Name." },
        iban: { type: "string", description: "IBAN." },
        bic: { type: "string", description: "BIC." },
        defaultJurisdiction: {
          type: "string",
          description:
            "Default Gerichtsstand für Verträge (z.B. 'Berlin', 'München').",
        },
        defaultClosing: {
          type: "string",
          description:
            "Default-Schlussformel (z.B. 'Mit freundlichen Grüßen', 'Mit besten Grüßen').",
        },
      },
    },
  },
];

const BRANDING_TOOL_NAMES = BRANDING_TOOLS.map((t) => t.name) as string[];

/** Runtime guard for the dispatcher in atlas-tool-executor.ts. */
export function isBrandingToolName(name: string): boolean {
  return BRANDING_TOOL_NAMES.includes(name);
}

/* ── Tool execution ─────────────────────────────────────────────────── */

const SetOrgBrandingInput = z.object({
  letterheadName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(200).optional(),
  website: z.string().trim().max(200).optional(),
  raNumber: z.string().trim().max(100).optional(),
  authority: z.string().trim().max(200).optional(),
  insuranceNote: z.string().trim().max(500).optional(),
  bankName: z.string().trim().max(100).optional(),
  iban: z.string().trim().max(40).optional(),
  bic: z.string().trim().max(20).optional(),
  defaultJurisdiction: z.string().trim().max(100).optional(),
  defaultClosing: z.string().trim().max(100).optional(),
});

async function getOrgBranding(
  callerOrgId: string,
): Promise<BrandingToolResult> {
  const b = await prisma.atlasOrgBranding.findUnique({
    where: { organizationId: callerOrgId },
    select: {
      letterheadName: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      raNumber: true,
      authority: true,
      insuranceNote: true,
      bankName: true,
      iban: true,
      bic: true,
      defaultJurisdiction: true,
      defaultClosing: true,
      logoUrl: true,
      updatedAt: true,
    },
  });
  return {
    content: JSON.stringify({
      branding: b ?? null,
      directive: b
        ? "Branding is set — use it in any Briefkopf the AI emits."
        : "Branding is EMPTY. Before producing any Schriftsatz / Brief / Vertrag, ask the lawyer for these MINIMUM fields: Kanzlei-Name, Adresse, Telefon, E-Mail, RA-Nummer, Schlussformel. Then call set_org_branding with the data.",
    }),
    isError: false,
  };
}

async function setOrgBranding(
  input: unknown,
  callerOrgId: string,
): Promise<BrandingToolResult> {
  const parsed = SetOrgBrandingInput.safeParse(input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({
        error: "Invalid input",
        details: parsed.error.flatten(),
      }),
      isError: true,
    };
  }
  const data: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v;
  }
  if (Object.keys(data).length === 0) {
    return {
      content: JSON.stringify({
        error: "No fields provided — pass at least one branding field.",
      }),
      isError: true,
    };
  }
  const upserted = await prisma.atlasOrgBranding.upsert({
    where: { organizationId: callerOrgId },
    create: { organizationId: callerOrgId, ...data },
    update: data,
    select: {
      letterheadName: true,
      address: true,
      phone: true,
      email: true,
      raNumber: true,
      defaultJurisdiction: true,
      defaultClosing: true,
    },
  });
  return {
    content: JSON.stringify({
      ok: true,
      branding: upserted,
      directive:
        "Branding saved. Future Schriftsatz/Brief/Vertrag drafts will auto-use these fields. Confirm to the lawyer: 'Briefkopf gespeichert — alle künftigen Dokumente nutzen das automatisch.'",
    }),
    isError: false,
  };
}

/** Bundle entry-point. Dispatches by tool-name to the appropriate handler. */
export async function executeBrandingTool(args: {
  name: string;
  input: unknown;
  callerOrgId: string;
}): Promise<BrandingToolResult> {
  switch (args.name) {
    case "get_org_branding":
      return getOrgBranding(args.callerOrgId);
    case "set_org_branding":
      return setOrgBranding(args.input, args.callerOrgId);
    default:
      return {
        content: JSON.stringify({
          error: `Unknown branding tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}
