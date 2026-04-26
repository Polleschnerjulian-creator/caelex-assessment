/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the matter-service — the bilateral handshake state machine.
 * Critical regression coverage:
 *
 *   1. amendment counter-sign authorisation (Phase 7b bug-fix):
 *      when invitation.amendmentOf is set, the expected acceptor flips
 *      from the recipient to the ORIGINAL INVITER. Without this, the
 *      service rejected legitimate counter-signatures as NOT_AUTHORIZED.
 *
 *   2. 1-round amendment limit: re-amending an already-amended invite
 *      must throw INVALID_SCOPE (otherwise lawyers could lock operators
 *      into infinite negotiation drift).
 *
 *   3. scope-widening guard: amended scope must be ⊆ proposed.
 *
 *   4. token consumption / expiry: an already-used or expired token
 *      cannot be re-used.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScopeItem } from "@/lib/legal-network/scope";

// matter-tool-executor (transitive) imports `server-only`. Stub it so
// the matter-service module graph imports cleanly under jsdom.
vi.mock("server-only", () => ({}));

// ─── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    legalMatter: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    legalMatterInvitation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    // $transaction lets the service compose multiple writes atomically.
    // For tests we just call the callback with the same `prisma` mock,
    // so `tx.legalMatter.update(...)` resolves the same as `prisma.legalMatter.update(...)`.
    $transaction: vi.fn((cb: (tx: unknown) => unknown) =>
      Promise.resolve(cb(prismaMockExport)),
    ),
  },
}));

// We need a stable reference to use in the $transaction stub.
// (Vitest needs the import-after-mock dance.)
import { prisma } from "@/lib/prisma";
const prismaMockExport = prisma;

vi.mock("@/lib/legal-network/tokens", () => ({
  mintInviteToken: vi.fn(() => ({
    raw: "raw-token-abc",
    hash: "hash-token-abc",
    expiresAt: new Date("2030-01-01"),
  })),
  hashToken: vi.fn((raw: string) => `hash-${raw}`),
  isExpired: vi.fn((d: Date) => d.getTime() < Date.now()),
}));

vi.mock("@/lib/legal-network/handshake", () => ({
  computeHandshakeHash: vi.fn(() => "deterministic-handshake-hash"),
}));

// emitAccessLog is invoked from revoke + setStatus. Stub to no-op so
// we don't assert on the audit chain — that's covered separately.
vi.mock("@/lib/legal-network/require-matter", () => ({
  emitAccessLog: vi.fn(),
}));

import {
  createInvite,
  acceptInvite,
  rejectInvite,
  revokeMatter,
  setMatterStatus,
  createStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

// ─── Helpers ──────────────────────────────────────────────────────────

const mockedPrisma = vi.mocked(prisma);

const SCOPE_BASIC: ScopeItem[] = [
  { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
];
const SCOPE_AMENDED: ScopeItem[] = [
  // Drops the only category — strictly narrower
  { category: "COMPLIANCE_ASSESSMENTS", permissions: [] },
];

const FIRM_ORG = {
  id: "firm-1",
  orgType: "LAW_FIRM",
  isActive: true,
  name: "BHO Legal",
} as const;

const OPERATOR_ORG = {
  id: "op-1",
  orgType: "OPERATOR",
  isActive: true,
  name: "Rocket Inc",
} as const;

function buildMatter(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "matter-1",
    lawFirmOrgId: FIRM_ORG.id,
    clientOrgId: OPERATOR_ORG.id,
    name: "Test Mandate",
    reference: null,
    description: null,
    scope: [],
    status: "PENDING_INVITE",
    invitedBy: "user-firm-1",
    invitedFrom: "ATLAS",
    invitedAt: new Date("2026-01-01"),
    acceptedAt: null,
    acceptedBy: null,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    effectiveFrom: null,
    effectiveUntil: null,
    handshakeHash: "pending:placeholder",
    ...overrides,
  };
}

function buildInvitation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv-1",
    matterId: "matter-1",
    tokenHash: "hash-raw-token-abc",
    expiresAt: new Date("2030-01-01"),
    consumedAt: null,
    proposedScope: SCOPE_BASIC,
    proposedDurationMonths: 12,
    amendmentOf: null,
    createdAt: new Date("2026-01-01"),
    matter: buildMatter(),
    ...overrides,
  };
}

// ─── createInvite ─────────────────────────────────────────────────────

describe("matter-service / createInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a matter + invitation when both orgs are valid", async () => {
    mockedPrisma.organization.findUnique
      .mockResolvedValueOnce(FIRM_ORG)
      .mockResolvedValueOnce(OPERATOR_ORG);
    mockedPrisma.legalMatter.create.mockResolvedValue(buildMatter());
    mockedPrisma.legalMatterInvitation.create.mockResolvedValue(
      buildInvitation(),
    );

    const result = await createInvite({
      initiatorOrgId: FIRM_ORG.id,
      initiatorUserId: "user-firm-1",
      initiatorSide: "ATLAS",
      counterpartyOrgId: OPERATOR_ORG.id,
      name: "Test Mandate",
      proposedScope: SCOPE_BASIC,
    });

    expect(result.matter.id).toBe("matter-1");
    expect(result.rawToken).toBe("raw-token-abc");
    expect(mockedPrisma.legalMatter.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.legalMatterInvitation.create).toHaveBeenCalledTimes(1);
  });

  it("throws COUNTERPARTY_NOT_FOUND when operator missing", async () => {
    mockedPrisma.organization.findUnique
      .mockResolvedValueOnce(FIRM_ORG)
      .mockResolvedValueOnce(null);

    await expect(
      createInvite({
        initiatorOrgId: FIRM_ORG.id,
        initiatorUserId: "user-firm-1",
        initiatorSide: "ATLAS",
        counterpartyOrgId: "nonexistent",
        name: "Test",
        proposedScope: SCOPE_BASIC,
      }),
    ).rejects.toThrow(MatterServiceError);
  });

  it("throws COUNTERPARTY_WRONG_TYPE when client is a law firm (cross-side)", async () => {
    mockedPrisma.organization.findUnique
      .mockResolvedValueOnce(FIRM_ORG)
      .mockResolvedValueOnce({ ...OPERATOR_ORG, orgType: "LAW_FIRM" });

    await expect(
      createInvite({
        initiatorOrgId: FIRM_ORG.id,
        initiatorUserId: "user-firm-1",
        initiatorSide: "ATLAS",
        counterpartyOrgId: OPERATOR_ORG.id,
        name: "Test",
        proposedScope: SCOPE_BASIC,
      }),
    ).rejects.toThrow(/OPERATOR/);
  });

  it("rejects invalid scope at the schema layer", async () => {
    await expect(
      createInvite({
        initiatorOrgId: FIRM_ORG.id,
        initiatorUserId: "user-firm-1",
        initiatorSide: "ATLAS",
        counterpartyOrgId: OPERATOR_ORG.id,
        name: "Test",
        proposedScope: [], // empty — schema requires min 1
      }),
    ).rejects.toThrow(/scope/i);
  });
});

// ─── acceptInvite — original counter-party flow ──────────────────────

describe("matter-service / acceptInvite — original invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates the matter when the operator (counter-party) accepts as-proposed", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-op-1",
      acceptingOrgId: OPERATOR_ORG.id, // counter-party
    });

    expect(result.matter.status).toBe("ACTIVE");
    expect(result.counterToken).toBeUndefined();
  });

  it("throws NOT_AUTHORIZED when the LAW FIRM tries to accept its own invitation", async () => {
    // ATLAS-initiated invite — the firm cannot accept on the operator's behalf
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );

    await expect(
      acceptInvite({
        rawToken: "raw-token-abc",
        acceptingUserId: "user-firm-1",
        acceptingOrgId: FIRM_ORG.id, // wrong side
      }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });

  it("throws TOKEN_INVALID when token is unknown", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(null);

    await expect(
      acceptInvite({
        rawToken: "raw-bogus",
        acceptingUserId: "user-op-1",
        acceptingOrgId: OPERATOR_ORG.id,
      }),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("throws TOKEN_CONSUMED when the invitation was already used", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({ consumedAt: new Date("2026-01-15") }),
    );

    await expect(
      acceptInvite({
        rawToken: "raw-token-abc",
        acceptingUserId: "user-op-1",
        acceptingOrgId: OPERATOR_ORG.id,
      }),
    ).rejects.toMatchObject({ code: "TOKEN_CONSUMED" });
  });

  it("throws SCOPE_WIDENED when amended scope adds permissions", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );

    await expect(
      acceptInvite({
        rawToken: "raw-token-abc",
        acceptingUserId: "user-op-1",
        acceptingOrgId: OPERATOR_ORG.id,
        amendedScope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ", "EXPORT"], // proposed only had READ — privilege escalation
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "SCOPE_WIDENED" });
  });

  it("creates a counter-invitation when operator narrows the scope", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        proposedScope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ", "ANNOTATE"],
          },
        ],
      }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "PENDING_CONSENT" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );
    mockedPrisma.legalMatterInvitation.create.mockResolvedValue(
      buildInvitation({ id: "inv-counter", amendmentOf: "inv-1" }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-op-1",
      acceptingOrgId: OPERATOR_ORG.id,
      amendedScope: [
        // Drop ANNOTATE → narrower
        { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      ],
    });

    expect(result.matter.status).toBe("PENDING_CONSENT");
    expect(result.counterToken).toBe("raw-token-abc");
    // Counter-invitation must reference the original via amendmentOf
    expect(mockedPrisma.legalMatterInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amendmentOf: "inv-1" }),
      }),
    );
  });

  it("returns counterInvitationId on amend so caller can dispatch counter-sign email", async () => {
    // Phase H requirement: the route handler dispatches a counter-
    // sign email outside the DB transaction, so it needs the new
    // invitation id surfaced from the service. Without this field
    // the email dispatcher has no way to load the diff context.
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        proposedScope: [
          {
            category: "COMPLIANCE_ASSESSMENTS",
            permissions: ["READ", "ANNOTATE"],
          },
        ],
      }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "PENDING_CONSENT" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );
    mockedPrisma.legalMatterInvitation.create.mockResolvedValue(
      buildInvitation({ id: "inv-counter-h", amendmentOf: "inv-1" }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-op-1",
      acceptingOrgId: OPERATOR_ORG.id,
      amendedScope: [
        { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
      ],
    });

    expect(result.counterInvitationId).toBe("inv-counter-h");
  });

  it("does NOT set counterInvitationId on direct (non-amend) accept", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-op-1",
      acceptingOrgId: OPERATOR_ORG.id,
    });

    expect(result.matter.status).toBe("ACTIVE");
    expect(result.counterInvitationId).toBeUndefined();
  });
});

// ─── acceptInvite — AMENDMENT counter-sign flow (Phase 7b regression) ─

describe("matter-service / acceptInvite — amendment counter-sign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REGRESSION: original inviter (law firm) can counter-sign an amended invite", async () => {
    // Pre-Phase-7b bug: the lawyer (lawFirmOrgId) was rejected as
    // NOT_AUTHORIZED because expectedAcceptorOrgId was hardcoded to
    // the counter-party. After the fix, an invitation with
    // amendmentOf set flips the expected acceptor to the inviter side.
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        id: "inv-counter",
        amendmentOf: "inv-1",
        proposedScope: [
          { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
        ],
        matter: buildMatter({ status: "PENDING_CONSENT" }),
      }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ id: "inv-counter", consumedAt: new Date() }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-firm-1",
      acceptingOrgId: FIRM_ORG.id, // ← original ATLAS inviter, NOT counter-party
    });

    expect(result.matter.status).toBe("ACTIVE");
    expect(result.counterToken).toBeUndefined();
  });

  it("REGRESSION: operator cannot accept its OWN amendment", async () => {
    // Mirror of the above — for amendments, only the original inviter
    // counter-signs. The operator already amended; they shouldn't be
    // able to also "accept" their own narrowing (would skip lawyer
    // consent entirely).
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        id: "inv-counter",
        amendmentOf: "inv-1",
        matter: buildMatter({ status: "PENDING_CONSENT" }),
      }),
    );

    await expect(
      acceptInvite({
        rawToken: "raw-token-abc",
        acceptingUserId: "user-op-1",
        acceptingOrgId: OPERATOR_ORG.id, // wrong side for amendment
      }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });

  it("REGRESSION: lawyer cannot RE-AMEND an amendment (1-round limit)", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        id: "inv-counter",
        amendmentOf: "inv-1",
        matter: buildMatter({ status: "PENDING_CONSENT" }),
      }),
    );

    await expect(
      acceptInvite({
        rawToken: "raw-token-abc",
        acceptingUserId: "user-firm-1",
        acceptingOrgId: FIRM_ORG.id,
        amendedScope: SCOPE_AMENDED, // attempting a 2nd round
      }),
    ).rejects.toMatchObject({ code: "INVALID_SCOPE" });
  });

  it("CAELEX-side amendments flip identically: operator inviter counter-signs", async () => {
    // Same mechanics in the reverse direction — the operator originally
    // invited the firm, the firm narrowed the scope, now the operator
    // counter-signs.
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        id: "inv-counter",
        amendmentOf: "inv-1",
        matter: buildMatter({
          invitedFrom: "CAELEX",
          status: "PENDING_CONSENT",
        }),
        proposedScope: [
          { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
        ],
      }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ invitedFrom: "CAELEX", status: "ACTIVE" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );

    const result = await acceptInvite({
      rawToken: "raw-token-abc",
      acceptingUserId: "user-op-1",
      acceptingOrgId: OPERATOR_ORG.id, // original CAELEX inviter
    });

    expect(result.matter.status).toBe("ACTIVE");
  });
});

// ─── rejectInvite ────────────────────────────────────────────────────

describe("matter-service / rejectInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("either party can reject — operator path", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "CLOSED" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );

    const result = await rejectInvite({
      rawToken: "raw-token-abc",
      rejectingUserId: "user-op-1",
      rejectingOrgId: OPERATOR_ORG.id,
      reason: "Scope too broad",
    });

    expect(result.matter.status).toBe("CLOSED");
    expect(result.wasAmendment).toBe(false);
  });

  it("rejects when caller is not a party to the matter", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation(),
    );

    await expect(
      rejectInvite({
        rawToken: "raw-token-abc",
        rejectingUserId: "user-stranger",
        rejectingOrgId: "stranger-org",
        reason: "wrong",
      }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });

  it("flags rejecting an amendment counter-invitation as wasAmendment=true", async () => {
    mockedPrisma.legalMatterInvitation.findUnique.mockResolvedValue(
      buildInvitation({
        id: "inv-counter",
        amendmentOf: "inv-1",
        matter: buildMatter({ status: "PENDING_CONSENT" }),
      }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "CLOSED" }),
    );
    mockedPrisma.legalMatterInvitation.update.mockResolvedValue(
      buildInvitation({ consumedAt: new Date() }),
    );

    const result = await rejectInvite({
      rawToken: "raw-token-abc",
      rejectingUserId: "user-firm-1",
      rejectingOrgId: FIRM_ORG.id,
      reason: "Amendment too narrow",
    });

    expect(result.wasAmendment).toBe(true);
  });
});

// ─── revokeMatter ────────────────────────────────────────────────────

describe("matter-service / revokeMatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions an ACTIVE matter to REVOKED when operator acts", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "REVOKED" }),
    );

    const matter = await revokeMatter({
      matterId: "matter-1",
      actorUserId: "user-op-1",
      actorOrgId: OPERATOR_ORG.id,
      actorSide: "CAELEX",
      reason: "Engagement ended",
    });

    expect(matter.status).toBe("REVOKED");
  });

  it("either party can revoke — law firm path", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "REVOKED" }),
    );

    const matter = await revokeMatter({
      matterId: "matter-1",
      actorUserId: "user-firm-1",
      actorOrgId: FIRM_ORG.id,
      actorSide: "ATLAS",
      reason: "Conflict of interest",
    });

    expect(matter.status).toBe("REVOKED");
  });

  it("rejects double-revocation", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "REVOKED" }),
    );

    await expect(
      revokeMatter({
        matterId: "matter-1",
        actorUserId: "user-op-1",
        actorOrgId: OPERATOR_ORG.id,
        actorSide: "CAELEX",
        reason: "again",
      }),
    ).rejects.toMatchObject({ code: "MATTER_WRONG_STATE" });
  });

  it("rejects when caller is not a party", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );

    await expect(
      revokeMatter({
        matterId: "matter-1",
        actorUserId: "user-stranger",
        actorOrgId: "stranger-org",
        actorSide: "ATLAS",
        reason: "spam",
      }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });
});

// ─── setMatterStatus (suspend/resume) ────────────────────────────────

describe("matter-service / setMatterStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("operator can SUSPEND an ACTIVE matter", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "SUSPENDED" }),
    );

    const result = await setMatterStatus({
      matterId: "matter-1",
      nextStatus: "SUSPENDED",
      actorUserId: "user-op-1",
      actorOrgId: OPERATOR_ORG.id,
      actorSide: "CAELEX",
    });

    expect(result.status).toBe("SUSPENDED");
  });

  it("operator can RESUME a SUSPENDED matter", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "SUSPENDED" }),
    );
    mockedPrisma.legalMatter.update.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );

    const result = await setMatterStatus({
      matterId: "matter-1",
      nextStatus: "ACTIVE",
      actorUserId: "user-op-1",
      actorOrgId: OPERATOR_ORG.id,
      actorSide: "CAELEX",
    });

    expect(result.status).toBe("ACTIVE");
  });

  it("law firm CANNOT suspend (operator-only privilege)", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "ACTIVE" }),
    );

    await expect(
      setMatterStatus({
        matterId: "matter-1",
        nextStatus: "SUSPENDED",
        actorUserId: "user-firm-1",
        actorOrgId: FIRM_ORG.id,
        actorSide: "ATLAS",
      }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });

  it("rejects illegal transitions (e.g. PENDING_INVITE → SUSPENDED)", async () => {
    mockedPrisma.legalMatter.findUnique.mockResolvedValue(
      buildMatter({ status: "PENDING_INVITE" }),
    );

    await expect(
      setMatterStatus({
        matterId: "matter-1",
        nextStatus: "SUSPENDED",
        actorUserId: "user-op-1",
        actorOrgId: OPERATOR_ORG.id,
        actorSide: "CAELEX",
      }),
    ).rejects.toMatchObject({ code: "MATTER_WRONG_STATE" });
  });
});

// ─── createStandaloneMatter ───────────────────────────────────────────

describe("createStandaloneMatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a STANDALONE matter with null clientOrgId and empty scope", async () => {
    const created = {
      id: "m_solo_1",
      lawFirmOrgId: "lf_1",
      clientOrgId: null,
      name: "Neuer Workspace · 26.04.2026",
      reference: null,
      description: null,
      scope: [],
      status: "STANDALONE",
      invitedBy: "u_1",
      invitedFrom: "ATLAS",
      invitedAt: new Date(),
    };
    (
      prisma.legalMatter.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(created);

    const result = await createStandaloneMatter({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
    });

    expect(result.matterId).toBe("m_solo_1");
    expect(prisma.legalMatter.create).toHaveBeenCalledWith({
      data: {
        lawFirmOrgId: "lf_1",
        clientOrgId: null,
        name: expect.any(String),
        scope: [],
        status: "STANDALONE",
        invitedBy: "u_1",
        invitedFrom: "ATLAS",
      },
      select: { id: true },
    });
  });

  it("uses the provided name when given", async () => {
    (
      prisma.legalMatter.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: "m_solo_2",
    });
    await createStandaloneMatter({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
      name: "Q4 IPO due-diligence",
    });
    expect(prisma.legalMatter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Q4 IPO due-diligence" }),
      select: { id: true },
    });
  });

  it("uses default name when input.name is whitespace-only", async () => {
    (
      prisma.legalMatter.create as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ id: "m_solo_3" });

    await createStandaloneMatter({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
      name: "   ",
    });

    const callArg = (prisma.legalMatter.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { data: { name: string } };
    // Default name format: "Neuer Workspace · DD.MM.YYYY" (de-DE locale)
    expect(callArg.data.name).toMatch(
      /^Neuer Workspace · \d{2}\.\d{2}\.\d{4}$/,
    );
  });
});
