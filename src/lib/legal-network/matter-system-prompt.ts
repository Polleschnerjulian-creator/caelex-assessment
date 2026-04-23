import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Builds the Claude system prompt for a matter-scoped conversation.
 * The base prompt is the same space-law-practitioner persona used in
 * the generic /api/atlas/ai-chat route; we layer matter context on
 * top so Claude's answers are grounded in THIS client's situation.
 *
 * Phase 2b: matter metadata only (name, client, scope, jurisdictions).
 * Phase 3 will add Caelex-sourced compliance state via tool-use.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalMatter, Organization } from "@prisma/client";
import { ScopeSchema, type ScopeItem, type ScopeCategory } from "./scope";

const BASE_PROMPT = `You are Atlas, a specialised AI assistant for space-law practitioners at law firms that advise satellite operators, launch providers, and space-service companies.

You are currently working WITHIN a specific client matter. Ground every answer in the matter context below. When the lawyer asks a general question, still frame it in the context of this particular client and mandate.

## Response style
- Match the user's language (German, English, French, Spanish).
- Be precise and professional. Cite instruments at section/article level (e.g. "BWRG §6 Abs. 2", "EU Space Act Art. 14", "NIS2 Art. 21").
- Lead with the answer, then the reasoning. No fluff.
- If you lack client-specific data (compliance state, documents, incidents), say so explicitly — don't fabricate. In Phase 3 you'll be able to request this data via tools.
- Use German punctuation conventions when responding in German (— not —— ; „quotes" not "quotes").

## Domain knowledge
Deep knowledge of international space law (OST 1967, Liability Convention 1972, Registration Convention 1975), EU instruments (EU Space Act, NIS2), national space laws (Germany BWRG, France LOS 2008, UK Space Industry Act 2018, etc.), spectrum coordination (ITU), debris mitigation (IADC/ESA), export control (ITAR/EAR), insurance requirements.`;

const CATEGORY_HUMAN: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS:
    "Compliance-Bewertungen (Cyber, Debris, NIS2, Versicherung, Umwelt)",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumenten-Vault",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

export function buildMatterSystemPrompt(input: {
  matter: LegalMatter;
  clientOrg: Pick<Organization, "id" | "name">;
  lawFirmOrg: Pick<Organization, "id" | "name">;
}): string {
  const { matter, clientOrg, lawFirmOrg } = input;

  const scopeParse = ScopeSchema.safeParse(matter.scope);
  const scope: ScopeItem[] = scopeParse.success ? scopeParse.data : [];

  const jurisdictions = Array.from(
    new Set(scope.flatMap((s) => s.resourceFilter?.jurisdictions ?? [])),
  );

  const scopeLines = scope
    .map(
      (s) => `  - ${CATEGORY_HUMAN[s.category]} (${s.permissions.join(", ")})`,
    )
    .join("\n");

  const contextBlock = `
## Matter context

**Kanzlei:** ${lawFirmOrg.name}
**Mandant:** ${clientOrg.name}
**Mandat:** ${matter.name}${matter.reference ? ` (Ref. ${matter.reference})` : ""}
${matter.description ? `**Beschreibung:** ${matter.description}\n` : ""}
**Vereinbarter Scope** (was die Kanzlei vom Mandanten einsehen darf):
${scopeLines || "  - (keiner eingetragen)"}
${
  jurisdictions.length > 0
    ? `\n**Relevante Jurisdiktionen:** ${jurisdictions.join(", ")}`
    : ""
}
${
  matter.effectiveUntil
    ? `\n**Mandat läuft bis:** ${matter.effectiveUntil.toISOString().slice(0, 10)}`
    : ""
}

Alles was du jetzt produzierst (Memos, Listen, Entwürfe, Strategie-Empfehlungen) soll auf diesen Kontext zugeschnitten sein.`;

  return `${BASE_PROMPT}\n${contextBlock}`;
}
