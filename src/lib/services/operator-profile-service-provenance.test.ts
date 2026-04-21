/**
 * Provenance-integration tests for operator-profile-service.
 *
 * Complements the existing operator-profile-service.test.ts (which covers
 * completeness + translation logic). This file focuses exclusively on
 * the Phase-3 concern: updateProfile must emit DerivationTrace rows when
 * a `provenance` arg is supplied, and must remain fully backward-compatible
 * (no traces written) when it isn't.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOperatorProfile, mockWriteTrace, mockLoggerError } = vi.hoisted(
  () => ({
    mockOperatorProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockWriteTrace: vi.fn(),
    mockLoggerError: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorProfile: mockOperatorProfile,
  },
}));

vi.mock("@/lib/compliance/operator-types", () => ({
  CANONICAL_TO_EU: { satellite_operator: "SCO" },
}));

vi.mock("@/lib/services/derivation-trace-service", () => ({
  writeTrace: mockWriteTrace,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  updateProfile,
  type ProvenanceContext,
} from "@/lib/services/operator-profile-service";

// ─── Shared fixtures ────────────────────────────────────────────────────

const FIXED_PROFILE_ID = "profile-xyz";
const FIXED_ORG_ID = "org-1";

function makeProfileShape(overrides: Record<string, unknown> = {}) {
  return {
    id: FIXED_PROFILE_ID,
    organizationId: FIXED_ORG_ID,
    operatorType: null,
    euOperatorCode: null,
    entitySize: null,
    isResearch: false,
    isDefenseOnly: false,
    primaryOrbit: null,
    orbitAltitudeKm: null,
    satelliteMassKg: null,
    isConstellation: false,
    constellationSize: null,
    missionDurationMonths: null,
    plannedLaunchDate: null,
    establishment: null,
    operatingJurisdictions: [],
    offersEUServices: false,
    completeness: 0,
    lastUpdated: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Stateful mock — updateProfile calls .update TWICE (field update, then
  // completeness recalc). Mock must preserve state across calls so the
  // second call doesn't wipe the first's field changes.
  let state = makeProfileShape();
  mockOperatorProfile.findUnique.mockImplementation(async () => state);
  mockOperatorProfile.create.mockImplementation(async () => state);
  mockOperatorProfile.update.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      state = { ...state, ...data };
      return state;
    },
  );
  mockWriteTrace.mockResolvedValue({ id: "trace-1" });
});

// ─── Backward-compatibility: no provenance → no traces ─────────────────

describe("updateProfile backward compatibility", () => {
  it("writes zero traces when no provenance is provided", async () => {
    await updateProfile(FIXED_ORG_ID, { operatorType: "satellite_operator" });
    expect(mockWriteTrace).not.toHaveBeenCalled();
  });

  it("returns the updated profile exactly as before", async () => {
    const result = await updateProfile(FIXED_ORG_ID, {
      operatorType: "satellite_operator",
    });
    expect(result.operatorType).toBe("satellite_operator");
  });
});

// ─── User-edit provenance ──────────────────────────────────────────────

describe("updateProfile with user-edit provenance", () => {
  const provenance: ProvenanceContext = {
    via: "user-edit",
    userId: "user-42",
  };

  it("writes one trace per changed field", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      {
        operatorType: "satellite_operator",
        entitySize: "medium",
      },
      provenance,
    );
    expect(mockWriteTrace).toHaveBeenCalledTimes(2);
  });

  it("uses origin 'user-asserted'", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.origin).toBe("user-asserted");
  });

  it("passes entity context to writeTrace", async () => {
    await updateProfile(FIXED_ORG_ID, { entitySize: "large" }, provenance);
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.entityType).toBe("operator_profile");
    expect(call.entityId).toBe(FIXED_PROFILE_ID);
    expect(call.organizationId).toBe(FIXED_ORG_ID);
    expect(call.fieldName).toBe("entitySize");
    expect(call.value).toBe("large");
  });

  it("builds sourceRef of kind 'user-edit' with userId", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.sourceRef.kind).toBe("user-edit");
    expect(call.sourceRef.userId).toBe("user-42");
    expect(call.sourceRef.editedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("never passes confidence or modelVersion", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.confidence).toBeUndefined();
    expect(call.modelVersion).toBeUndefined();
  });
});

// ─── Assessment provenance ─────────────────────────────────────────────

describe("updateProfile with assessment provenance", () => {
  const provenance: ProvenanceContext = {
    via: "assessment",
    assessmentId: "assess-5",
    questionMapping: {
      operatorType: "q_operator_type",
      entitySize: "q_entity_size",
    },
  };

  it("uses origin 'assessment' and assessment-kind sourceRef", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.origin).toBe("assessment");
    expect(call.sourceRef.kind).toBe("assessment");
    expect(call.sourceRef.assessmentId).toBe("assess-5");
  });

  it("maps field → questionId via questionMapping", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator", entitySize: "medium" },
      provenance,
    );
    const byField = new Map<string, unknown>();
    for (const [{ fieldName, sourceRef }] of mockWriteTrace.mock.calls as [
      { fieldName: string; sourceRef: { questionId: string } },
    ][]) {
      byField.set(fieldName, sourceRef.questionId);
    }
    expect(byField.get("operatorType")).toBe("q_operator_type");
    expect(byField.get("entitySize")).toBe("q_entity_size");
  });

  it("falls back to 'profile-fields' questionId when mapping is missing", async () => {
    const noMap: ProvenanceContext = {
      via: "assessment",
      assessmentId: "assess-5",
    };
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      noMap,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.sourceRef.questionId).toBe("profile-fields");
  });

  it("respects explicit answeredAt timestamp", async () => {
    const when = new Date("2026-04-01T12:00:00Z");
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      { ...provenance, answeredAt: when },
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.sourceRef.answeredAt).toBe(when.toISOString());
  });
});

// ─── AI-inference provenance ───────────────────────────────────────────

describe("updateProfile with ai-inference provenance", () => {
  const provenance: ProvenanceContext = {
    via: "ai-inference",
    confidence: 0.82,
    modelVersion: "claude-sonnet-4-6",
    astraConversationId: "convo-1",
    prompt: "infer operator type",
  };

  it("uses origin 'ai-inferred' with confidence + modelVersion", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.origin).toBe("ai-inferred");
    expect(call.confidence).toBe(0.82);
    expect(call.modelVersion).toBe("claude-sonnet-4-6");
  });

  it("builds ai-inference sourceRef with conversation + prompt", async () => {
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );
    const call = mockWriteTrace.mock.calls[0][0];
    expect(call.sourceRef.kind).toBe("ai-inference");
    expect(call.sourceRef.astraConversationId).toBe("convo-1");
    expect(call.sourceRef.prompt).toBe("infer operator type");
  });
});

// ─── Resilience: trace failures never break profile update ────────────

describe("updateProfile resilience", () => {
  it("returns the updated profile even if writeTrace throws", async () => {
    mockWriteTrace.mockRejectedValueOnce(new Error("simulated DB failure"));
    const provenance: ProvenanceContext = {
      via: "user-edit",
      userId: "user-1",
    };

    const result = await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      provenance,
    );

    expect(result.operatorType).toBe("satellite_operator");
  });

  it("logs the error when writeTrace throws", async () => {
    mockWriteTrace.mockRejectedValueOnce(new Error("simulated DB failure"));
    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      { via: "user-edit", userId: "user-1" },
    );
    expect(mockLoggerError).toHaveBeenCalledOnce();
    const [msg, err] = mockLoggerError.mock.calls[0];
    expect(msg).toContain("operator_profile.operatorType");
    expect(err).toBeInstanceOf(Error);
  });

  it("continues writing remaining traces after one fails", async () => {
    mockWriteTrace
      .mockRejectedValueOnce(new Error("field 1 failed"))
      .mockResolvedValueOnce({ id: "trace-2" });

    await updateProfile(
      FIXED_ORG_ID,
      {
        operatorType: "satellite_operator",
        entitySize: "medium",
      },
      { via: "user-edit", userId: "user-1" },
    );

    expect(mockWriteTrace).toHaveBeenCalledTimes(2);
  });

  it("does NOT write a trace for the `completeness` recalculation field", async () => {
    // Simulate: second .update call returns changed completeness.
    mockOperatorProfile.update
      .mockResolvedValueOnce(
        makeProfileShape({ operatorType: "satellite_operator" }),
      )
      .mockResolvedValueOnce(
        makeProfileShape({
          operatorType: "satellite_operator",
          completeness: 0.12,
        }),
      );

    await updateProfile(
      FIXED_ORG_ID,
      { operatorType: "satellite_operator" },
      { via: "user-edit", userId: "user-1" },
    );

    const fields = mockWriteTrace.mock.calls.map(
      (c) => (c[0] as { fieldName: string }).fieldName,
    );
    expect(fields).not.toContain("completeness");
  });
});
