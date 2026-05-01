/**
 * profile.server.ts — write API tests (Sprint 1B).
 *
 * Covers `setVerifiedField`, `bulkSetVerifiedFields`, `revokeFieldEvidence`,
 * and the read API (`loadVerifiedOperatorProfile`, `loadVerifiedField`).
 *
 * Vitest with hoisted Prisma mocks. The mocks simulate the
 * OperatorProfile + DerivationTrace tables in-memory so we can assert:
 *
 *   1. setVerifiedField creates an OperatorProfile row if none exists
 *   2. setVerifiedField appends a hash-chained evidence row
 *   3. setVerifiedField mirrors the value into the legacy column
 *   4. setVerifiedField with revokeOlderEvidence flags previous rows
 *   5. setVerifiedField is idempotent for legacy-column writes (no-op
 *      when the value already matches, unless forceLegacyWrite is set)
 *   6. revokeFieldEvidence sets revokedAt + revokedReason on the latest row
 *   7. bulkSetVerifiedFields chains evidence rows in input order
 *   8. loadVerifiedOperatorProfile + loadVerifiedField reflect the writes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOperatorProfile,
  mockDerivationTrace,
  mockSecurityEvent,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOperatorProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockDerivationTrace: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  mockSecurityEvent: {
    create: vi.fn(),
  },
  mockTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorProfile: mockOperatorProfile,
    derivationTrace: mockDerivationTrace,
    securityEvent: mockSecurityEvent,
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  bulkSetVerifiedFields,
  loadVerifiedField,
  loadVerifiedOperatorProfile,
  revokeFieldEvidence,
  setVerifiedField,
} from "./profile.server";
import { genesisHashForOrg } from "./evidence.server";

const ORG_ID = "org_test_b1";
const PROFILE_ID = "profile_test_b1";

interface SimulatedTraceRow {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string;
  origin: string;
  sourceRef: unknown;
  confidence: number | null;
  modelVersion: string | null;
  expiresAt: Date | null;
  upstreamTraceIds: string[];
  verificationTier: string | null;
  sourceHash: string | null;
  prevHash: string | null;
  entryHash: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  attestationRef: unknown;
  revokedAt: Date | null;
  revokedReason: string | null;
  derivedAt: Date;
}

interface SimulatedProfileRow {
  id: string;
  organizationId: string;
  operatorType: string | null;
  euOperatorCode: string | null;
  entitySize: string | null;
  establishment: string | null;
  primaryOrbit: string | null;
  orbitAltitudeKm: number | null;
  satelliteMassKg: number | null;
  isConstellation: boolean;
  constellationSize: number | null;
  missionDurationMonths: number | null;
  plannedLaunchDate: Date | null;
  offersEUServices: boolean;
  lastUpdated: Date;
  [key: string]: unknown;
}

let chain: SimulatedTraceRow[] = [];
let profileRow: SimulatedProfileRow | null = null;
let traceIdCounter = 0;
let profileIdCounter = 0;

function nextTraceId(): string {
  traceIdCounter += 1;
  return `trace_${traceIdCounter.toString().padStart(6, "0")}`;
}

function nextProfileId(): string {
  profileIdCounter += 1;
  return `profile_${profileIdCounter.toString().padStart(6, "0")}`;
}

function fixtureProfile(
  overrides: Partial<SimulatedProfileRow> = {},
): SimulatedProfileRow {
  return {
    id: PROFILE_ID,
    organizationId: ORG_ID,
    operatorType: null,
    euOperatorCode: null,
    entitySize: null,
    establishment: null,
    primaryOrbit: null,
    orbitAltitudeKm: null,
    satelliteMassKg: null,
    isConstellation: false,
    constellationSize: null,
    missionDurationMonths: null,
    plannedLaunchDate: null,
    offersEUServices: false,
    lastUpdated: new Date(),
    ...overrides,
  };
}

function setupHappyPath(): void {
  // Transaction mock — pass through to the real mock
  mockTransaction.mockImplementation(
    async (
      cb: (tx: {
        derivationTrace: typeof mockDerivationTrace;
      }) => Promise<unknown>,
    ) => cb({ derivationTrace: mockDerivationTrace }),
  );

  // OperatorProfile.findUnique
  mockOperatorProfile.findUnique.mockImplementation(
    async ({
      where,
      select,
    }: {
      where: { organizationId?: string; id?: string };
      select?: Record<string, boolean>;
    }) => {
      if (!profileRow) return null;
      const matchOrg =
        where.organizationId !== undefined
          ? profileRow.organizationId === where.organizationId
          : true;
      const matchId =
        where.id !== undefined ? profileRow.id === where.id : true;
      if (!matchOrg || !matchId) return null;
      if (!select) return profileRow;
      const projected: Record<string, unknown> = {};
      for (const key of Object.keys(select)) {
        projected[key] = profileRow[key];
      }
      return projected;
    },
  );

  // OperatorProfile.create
  mockOperatorProfile.create.mockImplementation(
    async ({
      data,
      select,
    }: {
      data: { organizationId: string };
      select?: Record<string, boolean>;
    }) => {
      profileRow = fixtureProfile({
        id: nextProfileId(),
        organizationId: data.organizationId,
      });
      if (!select) return profileRow;
      return { id: profileRow.id };
    },
  );

  // OperatorProfile.update
  mockOperatorProfile.update.mockImplementation(
    async ({
      data,
    }: {
      where: { id: string };
      data: Partial<SimulatedProfileRow>;
    }) => {
      if (!profileRow) throw new Error("profileRow not initialized");
      profileRow = { ...profileRow, ...data };
      return profileRow;
    },
  );

  // DerivationTrace.findFirst
  mockDerivationTrace.findFirst.mockImplementation(
    async ({
      where,
    }: {
      where: { organizationId?: string; entryHash?: { not: null } };
    }) => {
      if (chain.length === 0) return null;
      const filtered = chain
        .filter(
          (r) =>
            (where.organizationId === undefined ||
              r.organizationId === where.organizationId) &&
            (where.entryHash === undefined || r.entryHash !== null),
        )
        .sort((a, b) => b.derivedAt.getTime() - a.derivedAt.getTime());
      return filtered[0] ?? null;
    },
  );

  // DerivationTrace.create
  mockDerivationTrace.create.mockImplementation(
    async ({ data }: { data: Partial<SimulatedTraceRow> }) => {
      const row: SimulatedTraceRow = {
        id: nextTraceId(),
        organizationId: data.organizationId ?? ORG_ID,
        entityType: data.entityType ?? "operator_profile",
        entityId: data.entityId ?? PROFILE_ID,
        fieldName: data.fieldName ?? "operatorType",
        value: data.value ?? "null",
        origin: data.origin ?? "user-asserted",
        sourceRef: data.sourceRef ?? null,
        confidence: data.confidence ?? null,
        modelVersion: data.modelVersion ?? null,
        expiresAt: data.expiresAt ?? null,
        upstreamTraceIds: data.upstreamTraceIds ?? [],
        verificationTier: (data.verificationTier as string) ?? null,
        sourceHash: data.sourceHash ?? null,
        prevHash: data.prevHash ?? null,
        entryHash: data.entryHash ?? null,
        verifiedAt: data.verifiedAt ?? null,
        verifiedBy: data.verifiedBy ?? null,
        attestationRef: data.attestationRef ?? null,
        revokedAt: data.revokedAt ?? null,
        revokedReason: data.revokedReason ?? null,
        derivedAt: new Date(Date.now() + chain.length),
      };
      chain.push(row);
      return row;
    },
  );

  // DerivationTrace.findMany
  mockDerivationTrace.findMany.mockImplementation(
    async ({
      where = {},
      orderBy,
      select,
    }: {
      where?: {
        entityType?: string;
        entityId?: string;
        fieldName?: string;
        revokedAt?: null;
        verificationTier?: { not: null };
        organizationId?: string;
      };
      orderBy?: unknown;
      select?: Record<string, boolean>;
      skip?: number;
      take?: number;
    }) => {
      let filtered = chain.filter((r) => {
        if (where.entityType !== undefined && r.entityType !== where.entityType)
          return false;
        if (where.entityId !== undefined && r.entityId !== where.entityId)
          return false;
        if (where.fieldName !== undefined && r.fieldName !== where.fieldName)
          return false;
        if (where.revokedAt === null && r.revokedAt !== null) return false;
        if (where.verificationTier !== undefined && r.verificationTier === null)
          return false;
        if (
          where.organizationId !== undefined &&
          r.organizationId !== where.organizationId
        )
          return false;
        return true;
      });
      // Default ordering: derivedAt DESC, id DESC
      filtered = filtered.sort(
        (a, b) => b.derivedAt.getTime() - a.derivedAt.getTime(),
      );
      // verifyChain queries with derivedAt ASC — detect via orderBy shape
      if (Array.isArray(orderBy)) {
        const first = orderBy[0] as Record<string, unknown> | undefined;
        if (first && first.derivedAt === "asc") {
          filtered = filtered.sort(
            (a, b) => a.derivedAt.getTime() - b.derivedAt.getTime(),
          );
        }
      }
      if (!select) return filtered;
      return filtered.map((r) => {
        const projected: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          projected[key] = (r as unknown as Record<string, unknown>)[key];
        }
        return projected;
      });
    },
  );

  // DerivationTrace.update — for revoke single
  mockDerivationTrace.update.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<SimulatedTraceRow>;
    }) => {
      const idx = chain.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error(`trace ${where.id} not found`);
      chain[idx] = { ...chain[idx], ...data };
      return chain[idx];
    },
  );

  // DerivationTrace.updateMany — for revoke prior
  mockDerivationTrace.updateMany.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: {
        entityType?: string;
        entityId?: string;
        fieldName?: string;
        revokedAt?: null;
      };
      data: Partial<SimulatedTraceRow>;
    }) => {
      let count = 0;
      for (const r of chain) {
        if (
          (where.entityType === undefined ||
            r.entityType === where.entityType) &&
          (where.entityId === undefined || r.entityId === where.entityId) &&
          (where.fieldName === undefined || r.fieldName === where.fieldName) &&
          (where.revokedAt !== null || r.revokedAt === null)
        ) {
          Object.assign(r, data);
          count += 1;
        }
      }
      return { count };
    },
  );

  mockSecurityEvent.create.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  chain = [];
  profileRow = null;
  traceIdCounter = 0;
  profileIdCounter = 0;
  setupHappyPath();
});

// ─── setVerifiedField — happy path ─────────────────────────────────────

describe("setVerifiedField — happy path", () => {
  it("creates an OperatorProfile row if none exists", async () => {
    const result = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://www.handelsregister.de/...",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });

    expect(profileRow).not.toBeNull();
    expect(profileRow?.organizationId).toBe(ORG_ID);
    expect(result.operatorProfileId).toBe(profileRow?.id);
  });

  it("appends a hash-chained evidence row linked to GENESIS for first write", async () => {
    const result = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "user_anna",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });
    expect(result.evidence.prevHash).toBe(genesisHashForOrg(ORG_ID));
    expect(result.evidence.entryHash).toMatch(/^[0-9a-f]{64}$/);
    expect(chain.length).toBe(1);
  });

  it("mirrors the value into the legacy OperatorProfile column", async () => {
    await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    expect(profileRow?.establishment).toBe("DE");
  });

  it("chains the second evidence row to the first row's entryHash", async () => {
    const a = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "operatorType",
      value: "satellite_operator",
      tier: "T1_SELF_CONFIRMED",
      sourceArtifact: null,
      attestationRef: {
        kind: "self",
        userId: "user_anna",
        confirmedAt: "2026-04-30T10:00:00Z",
      },
    });
    const b = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:01:00Z",
      },
    });
    expect(b.evidence.prevHash).toBe(a.evidence.entryHash);
  });

  it("skips the legacy-column update when value already matches", async () => {
    profileRow = fixtureProfile({ establishment: "DE" });
    const result = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    expect(result.legacyColumnUpdated).toBe(false);
    expect(mockOperatorProfile.update).not.toHaveBeenCalled();
  });

  it("forces the legacy-column update when forceLegacyWrite is set", async () => {
    profileRow = fixtureProfile({ establishment: "DE" });
    const result = await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<handelsregister-snapshot>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
      forceLegacyWrite: true,
    });
    expect(result.legacyColumnUpdated).toBe(true);
    expect(mockOperatorProfile.update).toHaveBeenCalled();
  });
});

// ─── setVerifiedField — revocation ─────────────────────────────────────

describe("setVerifiedField — revocation", () => {
  it("revokes prior evidence rows for the same field when revokeOlderEvidence is set", async () => {
    await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "FR",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<some-source>",
      attestationRef: {
        kind: "public-source",
        source: "other",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T4_AUTHORITY_VERIFIED",
      sourceArtifact: "<authority-letter>",
      attestationRef: {
        kind: "authority",
        authority: "BAFA",
        decisionRef: "BAFA-2026-001",
        decisionDate: "2026-04-30",
      },
      revokeOlderEvidence: true,
      revokeReason: "Superseded by BAFA decision",
    });

    const firstRow = chain.find(
      (r) => r.fieldName === "establishment" && r.value === '"FR"',
    );
    expect(firstRow?.revokedAt).not.toBeNull();
    expect(firstRow?.revokedReason).toBe("Superseded by BAFA decision");
  });

  it("rejects revokeOlderEvidence:true without revokeReason", async () => {
    await expect(
      setVerifiedField({
        organizationId: ORG_ID,
        fieldName: "establishment",
        value: "DE",
        tier: "T2_SOURCE_VERIFIED",
        sourceArtifact: "x",
        attestationRef: {
          kind: "public-source",
          source: "other",
          sourceUrl: "https://x",
          fetchedAt: "2026-04-30T10:00:00Z",
        },
        revokeOlderEvidence: true,
      }),
    ).rejects.toThrow(/revokeReason/);
  });
});

// ─── revokeFieldEvidence ───────────────────────────────────────────────

describe("revokeFieldEvidence", () => {
  it("returns revoked:false when no evidence exists yet", async () => {
    profileRow = fixtureProfile();
    const result = await revokeFieldEvidence(ORG_ID, "establishment", "test");
    expect(result.revoked).toBe(false);
    expect(result.evidenceId).toBeNull();
  });

  it("flips revokedAt + revokedReason on the latest non-revoked row", async () => {
    await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "x",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    const result = await revokeFieldEvidence(
      ORG_ID,
      "establishment",
      "Conflict with BAFA letter dated 2026-04-30",
    );
    expect(result.revoked).toBe(true);
    expect(result.evidenceId).not.toBeNull();
    const row = chain.find((r) => r.id === result.evidenceId);
    expect(row?.revokedAt).not.toBeNull();
    expect(row?.revokedReason).toContain("Conflict with BAFA");
  });
});

// ─── bulkSetVerifiedFields ─────────────────────────────────────────────

describe("bulkSetVerifiedFields", () => {
  it("appends evidence rows in input order — chain stable", async () => {
    const results = await bulkSetVerifiedFields(ORG_ID, [
      {
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T1_SELF_CONFIRMED",
        sourceArtifact: null,
        attestationRef: {
          kind: "self",
          userId: "u1",
          confirmedAt: "2026-04-30T10:00:00Z",
        },
      },
      {
        fieldName: "establishment",
        value: "DE",
        tier: "T2_SOURCE_VERIFIED",
        sourceArtifact: "<x>",
        attestationRef: {
          kind: "public-source",
          source: "handelsregister-de",
          sourceUrl: "https://x",
          fetchedAt: "2026-04-30T10:01:00Z",
        },
      },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].evidence.prevHash).toBe(genesisHashForOrg(ORG_ID));
    expect(results[1].evidence.prevHash).toBe(results[0].evidence.entryHash);
  });
});

// ─── Read API ──────────────────────────────────────────────────────────

describe("loadVerifiedField", () => {
  it("returns null shape when no profile exists yet", async () => {
    const result = await loadVerifiedField(ORG_ID, "establishment");
    expect(result.value).toBeNull();
    expect(result.evidence).toBeNull();
    expect(result.highestTierEverSeen).toBeNull();
    expect(result.stale).toBe(false);
  });

  it("reflects a setVerifiedField write — value, tier, evidence", async () => {
    await setVerifiedField({
      organizationId: ORG_ID,
      fieldName: "establishment",
      value: "DE",
      tier: "T2_SOURCE_VERIFIED",
      sourceArtifact: "<x>",
      attestationRef: {
        kind: "public-source",
        source: "handelsregister-de",
        sourceUrl: "https://x",
        fetchedAt: "2026-04-30T10:00:00Z",
      },
    });
    const result = await loadVerifiedField<string>(ORG_ID, "establishment");
    expect(result.value).toBe("DE");
    expect(result.evidence?.verificationTier).toBe("T2_SOURCE_VERIFIED");
    expect(result.highestTierEverSeen).toBe("T2_SOURCE_VERIFIED");
  });
});

describe("loadVerifiedOperatorProfile", () => {
  it("returns empty shape when no profile exists yet", async () => {
    const profile = await loadVerifiedOperatorProfile(ORG_ID);
    expect(profile.organizationId).toBe(ORG_ID);
    expect(profile.weakestTier).toBeNull();
    expect(profile.fields.establishment.value).toBeNull();
  });

  it("reports weakestTier across multiple verified fields", async () => {
    await bulkSetVerifiedFields(ORG_ID, [
      {
        fieldName: "operatorType",
        value: "satellite_operator",
        tier: "T1_SELF_CONFIRMED",
        sourceArtifact: null,
        attestationRef: {
          kind: "self",
          userId: "u1",
          confirmedAt: "2026-04-30T10:00:00Z",
        },
      },
      {
        fieldName: "establishment",
        value: "DE",
        tier: "T4_AUTHORITY_VERIFIED",
        sourceArtifact: "<authority-letter>",
        attestationRef: {
          kind: "authority",
          authority: "BAFA",
          decisionRef: "BAFA-2026-001",
          decisionDate: "2026-04-30",
        },
      },
    ]);
    const profile = await loadVerifiedOperatorProfile(ORG_ID);
    expect(profile.weakestTier).toBe("T1_SELF_CONFIRMED");
    expect(profile.fields.operatorType.value).toBe("satellite_operator");
    expect(profile.fields.establishment.value).toBe("DE");
  });
});
