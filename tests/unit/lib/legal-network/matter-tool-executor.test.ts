/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the Claude-callable matter tools. Coverage focuses on:
 *
 *   1. Dispatcher: routes name → executor, rejects unknown names.
 *   2. Per-tool input validation (Zod gates).
 *   3. Scope-gate propagation: when requireActiveMatter throws
 *      MatterAccessError, the tool returns isError=true with the
 *      caller-friendly message + the original code, never bubbles.
 *   4. Happy paths: each tool fetches expected data, emits an audit
 *      log entry, persists an artifact, and returns artifactId.
 *   5. persistArtifact behavior: position = last + 1, failure is
 *      swallowed (tool result still succeeds, artifactId undefined).
 *
 * require-matter is mocked here — its own gate logic is covered in
 * require-matter.test.ts. We just verify this module wires it
 * correctly into each tool's flow.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cybersecurityAssessment: { findMany: vi.fn() },
    nIS2Assessment: { findMany: vi.fn() },
    debrisAssessment: { findMany: vi.fn() },
    insuranceAssessment: { findMany: vi.fn() },
    environmentalAssessment: { findMany: vi.fn() },
    matterArtifact: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    matterNote: {
      create: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
  },
}));

// MatterAccessError must be a real class so `instanceof` checks in
// the executor work. Other surface from require-matter (the gate +
// log emitter) is mocked to vi.fn() so we control the flow.
vi.mock("@/lib/legal-network/require-matter", () => {
  class MatterAccessError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "MatterAccessError";
    }
  }
  return {
    MatterAccessError,
    requireActiveMatter: vi.fn(),
    emitAccessLog: vi.fn(),
  };
});

// AI SDK mock — cosineSimilarity needs to return a value above the
// 0.25 filter threshold for matches to survive into the result.
vi.mock("ai", () => ({
  embed: vi.fn(),
  cosineSimilarity: vi.fn(() => 0.7),
}));

// File-read mock for the embedded catalogue. Vitest needs the full
// surface — we use importOriginal to keep all real exports intact and
// only override readFile. NOTE: this requires `vi.hoisted` + an
// outer-scope `vi.fn()` so we can both inject it into the mock AND
// reference it from the test for assertion + mockResolvedValue calls.
// (A `vi.fn()` defined inside the factory is NOT accessible from the
// test scope, even though `vi.mocked(readFile)` looks like it should
// work — different instances at runtime.)
const mockedReadFile = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    default: { ...actual, readFile: mockedReadFile },
    readFile: mockedReadFile,
  };
});

// We rely on real ALL_SOURCES; no need to mock the data file.

import { prisma } from "@/lib/prisma";
import {
  requireActiveMatter,
  emitAccessLog,
  MatterAccessError,
} from "@/lib/legal-network/require-matter";
import { embed } from "ai";
import { ALL_SOURCES } from "@/data/legal-sources";

import { executeTool } from "@/lib/legal-network/matter-tool-executor";

const mockedPrisma = vi.mocked(prisma);
const mockedRequire = vi.mocked(requireActiveMatter);
const mockedLog = vi.mocked(emitAccessLog);
const mockedEmbed = vi.mocked(embed);
// `mockedReadFile` is the hoisted vi.fn() declared above the vi.mock —
// already in scope here, no re-assignment needed.

// ─── Builders ─────────────────────────────────────────────────────────

function buildMatter() {
  return {
    id: "matter-1",
    lawFirmOrgId: "firm-1",
    clientOrgId: "client-1",
    name: "Test Mandate",
    reference: null,
    description: null,
    scope: [{ category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] }],
    status: "ACTIVE",
    invitedBy: "user-firm-1",
    invitedFrom: "ATLAS",
    invitedAt: new Date("2026-01-01"),
    acceptedAt: new Date("2026-01-05"),
    acceptedBy: "user-client-1",
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    effectiveFrom: new Date("2026-01-05"),
    effectiveUntil: new Date("2030-01-05"),
    handshakeHash: "deadbeef".repeat(8),
  };
}

const ACTOR = {
  matter: buildMatter(),
  actorUserId: "user-firm-1",
  actorOrgId: "firm-1",
};

function setupHappyPathDefaults() {
  // Default: scope check passes, log writes succeed, artifact creates
  // get an id, all assessment queries return empty arrays.
  mockedRequire.mockResolvedValue({
    matter: ACTOR.matter,
    scope: ACTOR.matter.scope as never,
  });
  mockedLog.mockResolvedValue();
  mockedPrisma.matterArtifact.findFirst.mockResolvedValue({ position: 5 });
  mockedPrisma.matterArtifact.create.mockResolvedValue({ id: "art-new" });
  mockedPrisma.cybersecurityAssessment.findMany.mockResolvedValue([]);
  mockedPrisma.nIS2Assessment.findMany.mockResolvedValue([]);
  mockedPrisma.debrisAssessment.findMany.mockResolvedValue([]);
  mockedPrisma.insuranceAssessment.findMany.mockResolvedValue([]);
  mockedPrisma.environmentalAssessment.findMany.mockResolvedValue([]);
  mockedPrisma.document.findMany.mockResolvedValue([]);
}

// ─── Dispatcher ───────────────────────────────────────────────────────

describe("executeTool dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("routes load_compliance_overview through loadComplianceOverview", async () => {
    const result = await executeTool({
      name: "load_compliance_overview",
      input: {},
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    // Tool ran the scope check + emitted a log
    expect(mockedRequire).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "READ",
      }),
    );
    expect(mockedLog).toHaveBeenCalled();
  });

  it("routes draft_memo_to_note through draftMemoToNote", async () => {
    mockedPrisma.matterNote.create.mockResolvedValue({
      id: "note-1",
      title: "Memo title",
      content: "Memo body",
      createdAt: new Date(),
    });

    const result = await executeTool({
      name: "draft_memo_to_note",
      input: { title: "Memo title", content: "Some valid memo content here" },
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    expect(mockedRequire).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "COMPLIANCE_ASSESSMENTS",
        permission: "ANNOTATE",
      }),
    );
    expect(mockedPrisma.matterNote.create).toHaveBeenCalled();
  });

  it("returns UNKNOWN_TOOL for an unrecognised name", async () => {
    const result = await executeTool({
      // Force-cast since the union type rejects unknown strings
      name: "nonexistent" as never,
      input: {},
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("UNKNOWN_TOOL");
  });
});

// ─── load_compliance_overview ─────────────────────────────────────────

describe("load_compliance_overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("returns INVALID_INPUT for malformed args", async () => {
    const result = await executeTool({
      name: "load_compliance_overview",
      input: { detail_level: "all_the_things" }, // not in enum
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
    // Scope check shouldn't have been run if input was rejected
    expect(mockedRequire).not.toHaveBeenCalled();
  });

  it("surfaces MatterAccessError as a tool error with the original code", async () => {
    mockedRequire.mockRejectedValueOnce(
      new MatterAccessError("SCOPE_INSUFFICIENT", "no read on compliance"),
    );

    const result = await executeTool({
      name: "load_compliance_overview",
      input: {},
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.code).toBe("SCOPE_INSUFFICIENT");
    expect(payload.error).toContain("Access denied");
    // No log/artifact should have been written on a denied call
    expect(mockedLog).not.toHaveBeenCalled();
    expect(mockedPrisma.matterArtifact.create).not.toHaveBeenCalled();
  });

  it("rethrows non-MatterAccessError exceptions (programmer errors)", async () => {
    mockedRequire.mockRejectedValueOnce(new TypeError("oops"));

    await expect(
      executeTool({
        name: "load_compliance_overview",
        input: {},
        ...ACTOR,
      }),
    ).rejects.toThrow(TypeError);
  });

  it("on success: returns counts JSON, emits log, creates artifact at position+1", async () => {
    mockedPrisma.cybersecurityAssessment.findMany.mockResolvedValue([
      {
        id: "c1",
        assessmentName: "C1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockedPrisma.nIS2Assessment.findMany.mockResolvedValue([
      {
        id: "n1",
        assessmentName: "N1",
        entityClassification: "ESSENTIAL",
        classificationReason: "size > 250",
        updatedAt: new Date(),
      },
    ]);

    const result = await executeTool({
      name: "load_compliance_overview",
      input: {},
      conversationId: "conv-1",
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.counts).toMatchObject({
      cybersecurity: 1,
      nis2: 1,
      debris: 0,
      insurance: 0,
      environmental: 0,
    });
    expect(payload.nis2_classifications).toEqual(["ESSENTIAL"]);

    // Artifact created with conversationId attached + position 6 (last was 5)
    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matterId: "matter-1",
          conversationId: "conv-1",
          kind: "COMPLIANCE_OVERVIEW",
          position: 6,
        }),
      }),
    );
    expect(result.artifactId).toBe("art-new");

    // Log emitted with the right shape
    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "READ_ASSESSMENT",
        matterScope: "COMPLIANCE_ASSESSMENTS",
        resourceType: "ComplianceOverview",
      }),
    );
  });

  it("detail_level=full includes the `recent` block in the payload", async () => {
    const result = await executeTool({
      name: "load_compliance_overview",
      input: { detail_level: "full" },
      ...ACTOR,
    });

    const payload = JSON.parse(result.content);
    expect(payload.recent).toBeDefined();
    expect(payload.recent.cybersecurity).toBeInstanceOf(Array);
  });
});

// ─── search_legal_sources ─────────────────────────────────────────────

// NOTE: The executor caches the embeddings catalogue at module
// scope (loadCatalogue() returns the same Promise on subsequent
// calls). This means within ONE describe-block sharing one import,
// only the FIRST readFile mock actually fires — the rest pull from
// cache. Tests are ordered to populate the cache once with valid
// data, then exercise downstream branches (embed failure, validation,
// then NOT_INDEXED last in its own describe with a reset).

describe("search_legal_sources — happy + downstream branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("happy path: returns matches + creates CITATIONS artifact", async () => {
    const sample = ALL_SOURCES[0];

    mockedReadFile.mockResolvedValue(
      JSON.stringify([
        {
          id: `source:${sample.id}`,
          type: "source",
          contentHash: "abc",
          vector: new Array(512).fill(0),
        },
      ]),
    );
    mockedEmbed.mockResolvedValueOnce({
      embedding: new Array(512).fill(0),
    } as never);

    const result = await executeTool({
      name: "search_legal_sources",
      input: { query: "Frequenz Lizenz Filing" },
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.matches).toHaveLength(1);
    expect(payload.matches[0].id).toBe(sample.id);

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: "CITATIONS" }),
      }),
    );
    expect(result.artifactId).toBe("art-new");

    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUMMARY_GENERATED",
        matterScope: "AUDIT_LOGS",
      }),
    );
  });

  it("returns EMBEDDING_ERROR when the embed call rejects", async () => {
    // Catalogue is cached from the previous test — readFile mock no
    // longer fires. We only need to break embed() to hit this branch.
    mockedEmbed.mockRejectedValueOnce(new Error("provider down"));

    const result = await executeTool({
      name: "search_legal_sources",
      input: { query: "anything" },
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("EMBEDDING_ERROR");
  });

  it("INVALID_INPUT for too-short query", async () => {
    const result = await executeTool({
      name: "search_legal_sources",
      input: { query: "a" }, // < 4 chars
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
  });
});

// ─── draft_memo_to_note ───────────────────────────────────────────────

describe("draft_memo_to_note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
    mockedPrisma.matterNote.create.mockResolvedValue({
      id: "note-x",
      title: "T",
      content: "C",
      createdAt: new Date(),
    });
  });

  it("INVALID_INPUT when content is too short", async () => {
    const result = await executeTool({
      name: "draft_memo_to_note",
      input: { title: "Valid Title", content: "tiny" }, // < 10 chars
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
    expect(mockedPrisma.matterNote.create).not.toHaveBeenCalled();
  });

  it("ANNOTATE-scope failure is surfaced with a user-friendly message", async () => {
    mockedRequire.mockRejectedValueOnce(
      new MatterAccessError("SCOPE_INSUFFICIENT", "no annotate"),
    );

    const result = await executeTool({
      name: "draft_memo_to_note",
      input: { title: "Memo", content: "Has enough content here" },
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.code).toBe("SCOPE_INSUFFICIENT");
    expect(payload.error).toContain("scope amendment");
    expect(mockedPrisma.matterNote.create).not.toHaveBeenCalled();
  });

  it("happy path: creates note + MEMO artifact (large widthHint)", async () => {
    const result = await executeTool({
      name: "draft_memo_to_note",
      input: { title: "Memo title", content: "Sufficiently long content body" },
      conversationId: "conv-2",
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    expect(mockedPrisma.matterNote.create).toHaveBeenCalled();
    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "MEMO",
          widthHint: "large",
          conversationId: "conv-2",
        }),
      }),
    );
    expect(result.artifactId).toBe("art-new");

    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MEMO_DRAFTED" }),
    );
  });
});

// ─── persistArtifact behaviour (observed via tool calls) ──────────────

describe("persistArtifact (tool-driven)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("computes position as last + 1 (or 1 when no prior artifacts)", async () => {
    mockedPrisma.matterArtifact.findFirst.mockResolvedValue(null);
    await executeTool({
      name: "load_compliance_overview",
      input: {},
      ...ACTOR,
    });

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 1 }),
      }),
    );
  });

  it("swallows persist failures: tool still returns success without artifactId", async () => {
    mockedPrisma.matterArtifact.create.mockRejectedValueOnce(
      new Error("disk full"),
    );

    const result = await executeTool({
      name: "load_compliance_overview",
      input: {},
      ...ACTOR,
    });

    // The tool result itself is fine — Claude still gets the data
    expect(result.isError).toBe(false);
    // But no artifact id is bubbled up → UI won't get a card
    expect(result.artifactId).toBeUndefined();
  });
});

// ─── compare_jurisdictions ────────────────────────────────────────────
//
// Phase W: tests run against the REAL JURISDICTION_DATA Map (no mock).
// That means assertions on country names + legislation match the
// actual dataset, so a regression in the data file would fail loudly
// here rather than ship silently. For "unknown code" tests we use
// codes deliberately not in the dataset (XX, ZZ).

describe("compare_jurisdictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("returns INVALID_INPUT when fewer than 2 jurisdictions supplied", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE"] },
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
    // No log written on validation failure
    expect(mockedLog).not.toHaveBeenCalled();
  });

  it("returns INVALID_INPUT when more than 5 jurisdictions supplied", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: {
        jurisdictions: ["DE", "FR", "IT", "ES", "AT", "PL"],
      },
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
  });

  it("happy path: 2 jurisdictions returns full payload + creates artifact", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "FR"] },
      conversationId: "conv-1",
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);

    expect(payload.jurisdictions).toHaveLength(2);
    expect(payload.jurisdictions[0].code).toBe("DE");
    expect(payload.jurisdictions[1].code).toBe("FR");
    // Each entry has all the structured fields the UI relies on
    expect(payload.jurisdictions[0]).toMatchObject({
      code: "DE",
      name: expect.any(String),
      flag: expect.any(String),
      legislation: expect.objectContaining({
        name: expect.any(String),
        yearEnacted: expect.any(Number),
        status: expect.any(String),
      }),
      licensingAuthority: expect.objectContaining({
        name: expect.any(String),
        website: expect.any(String),
      }),
      insurance: expect.objectContaining({
        mandatory: expect.any(Boolean),
        liabilityRegime: expect.any(String),
      }),
      debris: expect.any(Object),
      timeline: expect.any(Object),
      euSpaceAct: expect.any(Object),
    });
    expect(payload.unknown).toEqual([]);

    // Artifact persisted as JURISDICTION_COMPARE with widthHint=large
    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "JURISDICTION_COMPARE",
          widthHint: "large",
          conversationId: "conv-1",
        }),
      }),
    );
    expect(result.artifactId).toBe("art-new");
  });

  it("uppercases lowercase input codes", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["de", "fr"] },
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.jurisdictions.map((j: { code: string }) => j.code)).toEqual([
      "DE",
      "FR",
    ]);
  });

  it("de-duplicates repeated codes while preserving order", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["FR", "DE", "FR", "DE", "IT"] },
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.jurisdictions.map((j: { code: string }) => j.code)).toEqual([
      "FR",
      "DE",
      "IT",
    ]);
  });

  it("reports unknown codes separately and still resolves valid ones", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "XX", "FR", "ZZ"] },
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.jurisdictions.map((j: { code: string }) => j.code)).toEqual([
      "DE",
      "FR",
    ]);
    expect(payload.unknown).toEqual(["XX", "ZZ"]);
  });

  it("returns INSUFFICIENT_JURISDICTIONS when fewer than 2 valid codes resolve", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      // One valid, one unknown — only DE resolves, fails the min-2 check
      input: { jurisdictions: ["DE", "XX"] },
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("INSUFFICIENT_JURISDICTIONS");
    expect(result.content).toContain("XX");
    // No artifact written on insufficient-data failures
    expect(mockedPrisma.matterArtifact.create).not.toHaveBeenCalled();
  });

  it("emits AUDIT_LOGS-scoped log (NOT a compliance scope)", async () => {
    await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "FR"] },
      ...ACTOR,
    });

    // Audit-only — comparing public corpus data doesn't touch
    // matter-scoped categories like COMPLIANCE_ASSESSMENTS
    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUMMARY_GENERATED",
        matterScope: "AUDIT_LOGS",
        resourceType: "JurisdictionComparison",
      }),
    );
  });

  it("audit-log context includes the resolved codes + topic + unknown", async () => {
    await executeTool({
      name: "compare_jurisdictions",
      input: {
        jurisdictions: ["DE", "FR", "ZZ"],
        topic: "licensing",
      },
      ...ACTOR,
    });

    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          tool: "compare_jurisdictions",
          jurisdictions: ["DE", "FR"],
          topic: "licensing",
          unknown: ["ZZ"],
        }),
      }),
    );
  });

  it("title includes topic when supplied", async () => {
    await executeTool({
      name: "compare_jurisdictions",
      input: {
        jurisdictions: ["DE", "FR"],
        topic: "spectrum",
      },
      ...ACTOR,
    });

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "DE vs. FR — spectrum",
        }),
      }),
    );
  });

  it("title omits topic suffix when not supplied", async () => {
    await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "FR", "IT"] },
      ...ACTOR,
    });

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "DE vs. FR vs. IT",
        }),
      }),
    );
  });

  it("does NOT call requireActiveMatter (static data, no scope-gate)", async () => {
    await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "FR"] },
      ...ACTOR,
    });

    // Mirrors search_legal_sources behaviour — public corpus, no scope
    expect(mockedRequire).not.toHaveBeenCalled();
  });

  it("topic null in payload when not supplied", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: { jurisdictions: ["DE", "FR"] },
      ...ACTOR,
    });

    const payload = JSON.parse(result.content);
    expect(payload.topic).toBeNull();
  });

  it("topic propagates into payload when supplied", async () => {
    const result = await executeTool({
      name: "compare_jurisdictions",
      input: {
        jurisdictions: ["DE", "FR"],
        topic: "debris",
      },
      ...ACTOR,
    });

    const payload = JSON.parse(result.content);
    expect(payload.topic).toBe("debris");
  });
});

// ─── list_matter_documents ────────────────────────────────────────────
//
// Documents ARE client data — the scope-gate (DOCUMENTS / READ) is
// enforced. These tests cover: scope-failure surfacing, enum-validation,
// query/category/status filtering, audit-log shape, payload structure.

describe("list_matter_documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathDefaults();
  });

  it("INVALID_INPUT for malformed args (limit > 25)", async () => {
    const result = await executeTool({
      name: "list_matter_documents",
      input: { limit: 100 },
      ...ACTOR,
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_INPUT");
    // Scope check shouldn't run if input was rejected
    expect(mockedRequire).not.toHaveBeenCalled();
  });

  it("surfaces SCOPE_INSUFFICIENT as access-denied tool error", async () => {
    mockedRequire.mockRejectedValueOnce(
      new MatterAccessError("SCOPE_INSUFFICIENT", "no DOCUMENTS read"),
    );

    const result = await executeTool({
      name: "list_matter_documents",
      input: {},
      ...ACTOR,
    });

    expect(result.isError).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.code).toBe("SCOPE_INSUFFICIENT");
    expect(payload.error).toContain("DOCUMENTS");
    // No DB query, no log on a denied call
    expect(mockedPrisma.document.findMany).not.toHaveBeenCalled();
    expect(mockedLog).not.toHaveBeenCalled();
  });

  it("INVALID_CATEGORY for unknown category enum value", async () => {
    const result = await executeTool({
      name: "list_matter_documents",
      input: { category: "TOTALLY_FAKE_CATEGORY" },
      ...ACTOR,
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_CATEGORY");
    // Scope check passed, but DB query never ran
    expect(mockedPrisma.document.findMany).not.toHaveBeenCalled();
  });

  it("INVALID_STATUS for unknown status enum value", async () => {
    const result = await executeTool({
      name: "list_matter_documents",
      input: { status: "ARCHIVED_FOREVER" },
      ...ACTOR,
    });
    expect(result.isError).toBe(true);
    expect(result.content).toContain("INVALID_STATUS");
  });

  it("requires DOCUMENTS scope with READ permission", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: {},
      ...ACTOR,
    });
    expect(mockedRequire).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "DOCUMENTS",
        permission: "READ",
      }),
    );
  });

  it("happy path: returns payload with documents + creates artifact", async () => {
    const sampleDoc = {
      id: "doc-1",
      name: "Mission Authorisation 2026",
      fileName: "auth-2026.pdf",
      fileSize: 524_288,
      mimeType: "application/pdf",
      category: "AUTHORIZATION",
      subcategory: null,
      status: "ACTIVE",
      version: 2,
      issueDate: new Date("2026-01-15"),
      expiryDate: new Date("2027-01-15"),
      isExpired: false,
      moduleType: "AUTHORIZATION",
      regulatoryRef: "BWRG §6 Abs. 2",
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-04-01"),
    };
    mockedPrisma.document.findMany.mockResolvedValue([sampleDoc]);

    const result = await executeTool({
      name: "list_matter_documents",
      input: { query: "auth" },
      conversationId: "conv-1",
      ...ACTOR,
    });

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content);
    expect(payload.totalMatches).toBe(1);
    expect(payload.documents[0]).toMatchObject({
      id: "doc-1",
      name: "Mission Authorisation 2026",
      category: "AUTHORIZATION",
      status: "ACTIVE",
      version: 2,
      regulatoryRef: "BWRG §6 Abs. 2",
    });
    // Dates are ISO strings in the wire payload
    expect(typeof payload.documents[0].issueDate).toBe("string");
    expect(typeof payload.documents[0].expiryDate).toBe("string");

    // Artifact persisted with kind=DOCUMENT_REFERENCE
    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DOCUMENT_REFERENCE",
          conversationId: "conv-1",
        }),
      }),
    );
    expect(result.artifactId).toBe("art-new");
  });

  it("scopes findMany to clientOrgId + isLatest=true", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: {},
      ...ACTOR,
    });

    expect(mockedPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ACTOR.matter.clientOrgId,
          isLatest: true,
        }),
      }),
    );
  });

  it("query is passed as case-insensitive contains on name + fileName", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: { query: "Insurance" },
      ...ACTOR,
    });

    const call = mockedPrisma.document.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { name: { contains: "Insurance", mode: "insensitive" } },
      { fileName: { contains: "Insurance", mode: "insensitive" } },
    ]);
  });

  it("category filter is passed through as enum value", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: { category: "INSURANCE_POLICY" },
      ...ACTOR,
    });

    const call = mockedPrisma.document.findMany.mock.calls[0][0];
    expect(call.where.category).toBe("INSURANCE_POLICY");
  });

  it("status filter is passed through as enum value", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: { status: "EXPIRED" },
      ...ACTOR,
    });

    const call = mockedPrisma.document.findMany.mock.calls[0][0];
    expect(call.where.status).toBe("EXPIRED");
  });

  it("default limit is 10, configurable up to 25", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: {},
      ...ACTOR,
    });
    expect(mockedPrisma.document.findMany.mock.calls[0][0].take).toBe(10);

    vi.clearAllMocks();
    setupHappyPathDefaults();

    await executeTool({
      name: "list_matter_documents",
      input: { limit: 25 },
      ...ACTOR,
    });
    expect(mockedPrisma.document.findMany.mock.calls[0][0].take).toBe(25);
  });

  it("emits DOCUMENTS-scoped audit log with READ_DOCUMENT action", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: { query: "license", category: "LICENSE" },
      ...ACTOR,
    });

    expect(mockedLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "READ_DOCUMENT",
        matterScope: "DOCUMENTS",
        resourceType: "DocumentList",
        context: expect.objectContaining({
          tool: "list_matter_documents",
          query: "license",
          category: "LICENSE",
          hits: 0,
        }),
      }),
    );
  });

  it("title humanises filter components", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: { category: "INSURANCE_POLICY", query: "Q1 2026" },
      ...ACTOR,
    });

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Dokumente: insurance policy · „Q1 2026"',
        }),
      }),
    );
  });

  it("fallback title when no filters supplied", async () => {
    await executeTool({
      name: "list_matter_documents",
      input: {},
      ...ACTOR,
    });

    expect(mockedPrisma.matterArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Dokumente — 0 Treffer",
        }),
      }),
    );
  });
});
