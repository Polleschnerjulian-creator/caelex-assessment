// tests/unit/lib/legal-network/matter-system-prompt.test.ts

/**
 * Unit tests for buildMatterSystemPrompt.
 *
 * The function composes the Claude system prompt for a matter-scoped
 * Atlas conversation. Bugs here surface directly in lawyer-facing
 * answers — wrong scope, missing client name, leaked jurisdictions,
 * etc. The pinned guarantees:
 *
 *   - The base persona prompt is always present
 *   - Client + law-firm names appear verbatim in the matter block
 *   - Reference is wrapped in parentheses when set, omitted when null
 *   - Description block is omitted when null/empty
 *   - Scope categories are emitted in human-readable German labels
 *   - Empty scope falls through to "(keiner eingetragen)" line
 *   - Jurisdictions are deduped and joined when present
 *   - effectiveUntil is rendered as ISO YYYY-MM-DD when set
 */

import { describe, it, expect, vi } from "vitest";
import type { LegalMatter, Organization } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { buildMatterSystemPrompt } from "@/lib/legal-network/matter-system-prompt";

// ── Fixtures ─────────────────────────────────────────────────────

function makeMatter(overrides: Partial<LegalMatter> = {}): LegalMatter {
  return {
    id: "m-1",
    name: "Genehmigungsverfahren Sat-A",
    reference: "BHO-2026-001",
    description: null,
    status: "ACTIVE",
    scope: [],
    invitedFrom: "ATLAS",
    proposedBy: "ATLAS",
    lawFirmOrgId: "lf-1",
    clientOrgId: "cl-1",
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as LegalMatter;
}

const lawFirm: Pick<Organization, "id" | "name"> = {
  id: "lf-1",
  name: "BHO Legal",
};
const client: Pick<Organization, "id" | "name"> = {
  id: "cl-1",
  name: "ACME Satellites GmbH",
};

describe("buildMatterSystemPrompt — base persona prompt", () => {
  it("always includes the Atlas persona introduction", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter(),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("You are Atlas");
    expect(out).toContain("space-law practitioners");
  });

  it("always includes the response-style guidance", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter(),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("Response style");
    expect(out).toContain("Match the user's language");
  });
});

describe("buildMatterSystemPrompt — matter context block", () => {
  it("renders the law-firm and client names verbatim", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter(),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("**Kanzlei:** BHO Legal");
    expect(out).toContain("**Mandant:** ACME Satellites GmbH");
  });

  it("renders the reference in parentheses when present", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({ reference: "BHO-2026-001" }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toMatch(
      /\*\*Mandat:\*\* Genehmigungsverfahren Sat-A \(Ref\. BHO-2026-001\)/,
    );
  });

  it("omits the reference parenthetical when reference is null", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({ reference: null }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("**Mandat:** Genehmigungsverfahren Sat-A");
    expect(out).not.toContain("(Ref.");
  });

  it("renders description block when set, omits it when null", () => {
    const withDesc = buildMatterSystemPrompt({
      matter: makeMatter({ description: "Frequenz-Aufstockung." }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(withDesc).toContain("**Beschreibung:** Frequenz-Aufstockung.");

    const withoutDesc = buildMatterSystemPrompt({
      matter: makeMatter({ description: null }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(withoutDesc).not.toContain("**Beschreibung:**");
  });
});

describe("buildMatterSystemPrompt — scope rendering", () => {
  it("emits one bullet line per scope item with German label + permissions", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({
        scope: [
          { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
          {
            category: "AUTHORIZATION_WORKFLOWS",
            permissions: ["READ", "ANNOTATE"],
          },
        ],
      }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toMatch(/Compliance-Bewertungen.*\(READ\)/);
    expect(out).toMatch(/Genehmigungs-Workflows.*\(READ, ANNOTATE\)/);
  });

  it("falls back to '(keiner eingetragen)' when scope is empty", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({ scope: [] }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("(keiner eingetragen)");
  });

  it("falls back to '(keiner eingetragen)' when scope JSON fails Zod validation", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({
        scope: [{ totally: "wrong shape" }] as unknown as never,
      }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("(keiner eingetragen)");
  });
});

describe("buildMatterSystemPrompt — jurisdictions", () => {
  it("dedupes jurisdictions across scope items", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({
        scope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ"],
            resourceFilter: { jurisdictions: ["DE", "EU"] },
          },
          {
            category: "AUTHORIZATION_WORKFLOWS",
            permissions: ["READ"],
            resourceFilter: { jurisdictions: ["DE"] },
          },
        ],
      }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    // Only one DE despite appearing in two scope items
    const occurrences = (out.match(/\bDE\b/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(out).toContain("**Relevante Jurisdiktionen:** DE, EU");
  });

  it("omits the jurisdictions block when no scope item has resourceFilter.jurisdictions", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({
        scope: [{ category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] }],
      }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).not.toContain("Relevante Jurisdiktionen");
  });
});

describe("buildMatterSystemPrompt — effectiveUntil", () => {
  it("renders effectiveUntil as YYYY-MM-DD when set", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({
        effectiveUntil: new Date("2027-01-15T12:00:00Z"),
      }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).toContain("**Mandat läuft bis:** 2027-01-15");
  });

  it("omits the effectiveUntil block when null", () => {
    const out = buildMatterSystemPrompt({
      matter: makeMatter({ effectiveUntil: null }),
      clientOrg: client,
      lawFirmOrg: lawFirm,
    });
    expect(out).not.toContain("Mandat läuft bis");
  });
});
