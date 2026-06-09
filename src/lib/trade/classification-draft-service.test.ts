/**
 * Tests for src/lib/trade/classification-draft-service.ts — Sprint Z4c.
 *
 * Uses vi.mock to stub Prisma so the tests exercise the service's
 * authorisation gates + payload-shaping logic without a real DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    tradeItem: { findFirst: vi.fn() },
    tradeItemClassificationDraft: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  createDraft,
  recordDecision,
  listDrafts,
  getDraft,
  truncateRawText,
  ApprovalPolicyError,
  RAW_TEXT_SNAPSHOT_CAP,
} from "./classification-draft-service";
import type { ClassificationDraft } from "./classification-draft-builder";

const scope = { organizationId: "org-1", userId: "user-1" };

const dummyDraft: ClassificationDraft = {
  proposals: [
    {
      canonicalId: "USML:XV(a)(7)(i)",
      regime: "ITAR-USML",
      title: "EO sub-0.5 m",
      citation: "22 CFR §121.1 Cat XV(a)(7)(i)",
      reasonsForControl: ["ITAR"],
      confidence: "HIGH",
      rationale: "Aperture 0.30 m matches.",
      evidence: [],
      source: "candidate",
    },
  ],
  primary: {
    canonicalId: "USML:XV(a)(7)(i)",
    regime: "ITAR-USML",
    title: "EO sub-0.5 m",
    citation: "22 CFR §121.1 Cat XV(a)(7)(i)",
    reasonsForControl: ["ITAR"],
    confidence: "HIGH",
    rationale: "Aperture 0.30 m matches.",
    evidence: [],
    source: "candidate",
  },
  attributes: { apertureMeters: 0.3 },
  evidence: [],
  attributesNeeded: [],
  summary: "Proposed classification: USML:XV(a)(7)(i)",
  disclaimer: "TEST DISCLAIMER — SCREENING-LEVEL GUIDANCE only.",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDraft — happy path", () => {
  it("persists a draft with denormalised primary fields + JSON evidence", async () => {
    mockPrisma.tradeItem.findFirst.mockResolvedValue({ id: "ti-1" });
    mockPrisma.tradeItemClassificationDraft.create.mockResolvedValue({
      id: "d-1",
    });

    await createDraft(scope, {
      tradeItemId: "ti-1",
      draft: dummyDraft,
      sourceFilename: "reaction-wheel.pdf",
      rawTextSnapshot: "short text",
    });

    expect(
      mockPrisma.tradeItemClassificationDraft.create,
    ).toHaveBeenCalledOnce();
    const args =
      mockPrisma.tradeItemClassificationDraft.create.mock.calls[0][0];
    expect(args.data.organizationId).toBe("org-1");
    expect(args.data.createdById).toBe("user-1");
    expect(args.data.tradeItemId).toBe("ti-1");
    // Denormalised primary copied to top-level columns for cheap list reads.
    expect(args.data.proposedEccn).toBe("USML:XV(a)(7)(i)");
    expect(args.data.proposedRegime).toBe("ITAR-USML");
    expect(args.data.confidence).toBe("HIGH");
    expect(args.data.decision).toBe("PENDING");
    // The full JSON blob carries the disclaimer through to review time.
    expect(args.data.evidence).toMatchObject({
      disclaimer: expect.stringContaining("SCREENING-LEVEL"),
    });
  });

  it("rejects createDraft when tradeItemId belongs to a different org", async () => {
    mockPrisma.tradeItem.findFirst.mockResolvedValue(null);

    await expect(
      createDraft(scope, {
        tradeItemId: "ti-other-org",
        draft: dummyDraft,
      }),
    ).rejects.toThrow(/not found in organization/);
    expect(
      mockPrisma.tradeItemClassificationDraft.create,
    ).not.toHaveBeenCalled();
  });

  it("accepts a draft without a tradeItemId (ad-hoc lookup path)", async () => {
    mockPrisma.tradeItemClassificationDraft.create.mockResolvedValue({
      id: "d-2",
    });

    await createDraft(scope, { draft: dummyDraft });

    // Org-scope is still applied, but tradeItem.findFirst was never invoked
    // because the tradeItemId branch was skipped.
    expect(mockPrisma.tradeItem.findFirst).not.toHaveBeenCalled();
    const args =
      mockPrisma.tradeItemClassificationDraft.create.mock.calls[0][0];
    expect(args.data.tradeItemId).toBeNull();
  });
});

describe("recordDecision", () => {
  it("flips a PENDING draft to ACCEPTED and stamps the reviewer", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      // Author is a DIFFERENT user than the approver (scope.userId =
      // "user-1") — four-eyes is satisfied.
      createdById: "author-other",
      evidence: { disclaimer: "DISCLAIMER VERBATIM" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
    });

    await recordDecision(scope, {
      draftId: "d-1",
      decision: "ACCEPTED",
      acceptedSnapshot: dummyDraft.primary,
      reviewNote: "Looks correct.",
    });

    const args =
      mockPrisma.tradeItemClassificationDraft.update.mock.calls[0][0];
    expect(args.where.id).toBe("d-1");
    expect(args.data.decision).toBe("ACCEPTED");
    expect(args.data.reviewedById).toBe("user-1");
    // Disclaimer-at-review is pulled verbatim from the persisted JSON
    // — load-bearing for audit when the disclaimer text later evolves.
    expect(args.data.disclaimerAtReview).toBe("DISCLAIMER VERBATIM");
    // Accepted snapshot is recorded.
    expect(args.data.acceptedSnapshot).not.toBeNull();
  });

  it("refuses to flip an already-decided draft", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
      evidence: {},
    });

    await expect(
      recordDecision(scope, { draftId: "d-1", decision: "REJECTED" }),
    ).rejects.toThrow(/already has a recorded decision/);
    expect(
      mockPrisma.tradeItemClassificationDraft.update,
    ).not.toHaveBeenCalled();
  });

  it("ignores acceptedSnapshot when the decision is REJECTED", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      // Author == approver, but REJECTED is always allowed (lowers
      // exposure) even under four-eyes.
      createdById: "user-1",
      evidence: { disclaimer: "DISCLAIMER" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
    });

    await recordDecision(scope, {
      draftId: "d-1",
      decision: "REJECTED",
      // Caller might accidentally pass a snapshot — it must be ignored
      // because REJECTED ≠ accepted-with-edits.
      acceptedSnapshot: dummyDraft.primary,
    });

    const args =
      mockPrisma.tradeItemClassificationDraft.update.mock.calls[0][0];
    // Prisma.JsonNull sentinel — its concrete shape isn't relevant
    // for this assertion; the load-bearing point is "no snapshot
    // payload" sits on the row.
    expect(args.data.acceptedSnapshot).not.toEqual(dummyDraft.primary);
  });
});

describe("recordDecision — four-eyes (T-M18: author ≠ approver)", () => {
  it("BLOCKS self-approval: the author cannot ACCEPT their own draft when four-eyes is ON", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      // Author IS the acting user (scope.userId = "user-1").
      createdById: "user-1",
      evidence: { disclaimer: "D" },
    });

    await expect(
      recordDecision(scope, {
        draftId: "d-1",
        decision: "ACCEPTED",
        acceptedSnapshot: dummyDraft.primary,
        approvalPolicy: { fourEyesEnabled: true },
      }),
    ).rejects.toBeInstanceOf(ApprovalPolicyError);

    // The decision must NOT have been written.
    expect(
      mockPrisma.tradeItemClassificationDraft.update,
    ).not.toHaveBeenCalled();
  });

  it("surfaces SECOND_APPROVER_REQUIRED when the lone author tries to self-approve", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      createdById: "user-1",
      evidence: { disclaimer: "D" },
    });

    await expect(
      recordDecision(scope, {
        draftId: "d-1",
        decision: "ACCEPTED",
        acceptedSnapshot: dummyDraft.primary,
        approvalPolicy: { fourEyesEnabled: true, soleEligibleApprover: true },
      }),
    ).rejects.toMatchObject({ reason: "SECOND_APPROVER_REQUIRED" });
  });

  it("ALLOWS a different approver to ACCEPT the author's draft", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      createdById: "author-other", // ≠ scope.userId ("user-1")
      evidence: { disclaimer: "D" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
    });

    await recordDecision(scope, {
      draftId: "d-1",
      decision: "ACCEPTED",
      acceptedSnapshot: dummyDraft.primary,
      approvalPolicy: { fourEyesEnabled: true },
    });

    expect(
      mockPrisma.tradeItemClassificationDraft.update,
    ).toHaveBeenCalledOnce();
  });

  it("ALLOWS the author to self-approve when four-eyes is OFF", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      createdById: "user-1",
      evidence: { disclaimer: "D" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
    });

    await recordDecision(scope, {
      draftId: "d-1",
      decision: "ACCEPTED",
      acceptedSnapshot: dummyDraft.primary,
      approvalPolicy: { fourEyesEnabled: false },
    });

    expect(
      mockPrisma.tradeItemClassificationDraft.update,
    ).toHaveBeenCalledOnce();
  });
});

describe("recordDecision — editable MODIFY (T-M18)", () => {
  const approver = { organizationId: "org-1", userId: "approver-2" };

  function pendingDraftAuthoredBy(authorId: string) {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      createdById: authorId,
      evidence: { disclaimer: "D" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
      decision: "MODIFIED",
    });
  }

  it("persists the EDITED code + source + justification on a MODIFIED decision", async () => {
    pendingDraftAuthoredBy("author-1");

    await recordDecision(approver, {
      draftId: "d-1",
      decision: "MODIFIED",
      approvalPolicy: { fourEyesEnabled: true },
      acceptedSnapshot: {
        canonicalId: "ECCN:9A515.a.1", // edited code
        regime: "EU-ANNEX-I",
        confidence: "LOW",
        overrideSource: "BAFA AzG 2025-0042",
        overrideJustification: "Datasheet aperture confirmed sub-threshold.",
        modifiedFromCanonicalId: "USML:XV(a)(7)(i)",
      },
    });

    const args =
      mockPrisma.tradeItemClassificationDraft.update.mock.calls[0][0];
    expect(args.data.decision).toBe("MODIFIED");
    // The EDITED code (not the original) is what gets recorded.
    expect(args.data.acceptedSnapshot).toMatchObject({
      canonicalId: "ECCN:9A515.a.1",
      overrideSource: "BAFA AzG 2025-0042",
      overrideJustification: "Datasheet aperture confirmed sub-threshold.",
      modifiedFromCanonicalId: "USML:XV(a)(7)(i)",
    });
    expect(args.data.reviewedById).toBe("approver-2");
  });

  it("REJECTS a MODIFIED decision missing a source", async () => {
    pendingDraftAuthoredBy("author-1");
    await expect(
      recordDecision(approver, {
        draftId: "d-1",
        decision: "MODIFIED",
        approvalPolicy: { fourEyesEnabled: true },
        acceptedSnapshot: {
          canonicalId: "ECCN:9A515.a.1",
          regime: "EU-ANNEX-I",
          confidence: "LOW",
          overrideJustification: "reason without a source",
        },
      }),
    ).rejects.toThrow(/requires a source/);
    expect(
      mockPrisma.tradeItemClassificationDraft.update,
    ).not.toHaveBeenCalled();
  });

  it("REJECTS a MODIFIED decision missing a justification", async () => {
    pendingDraftAuthoredBy("author-1");
    await expect(
      recordDecision(approver, {
        draftId: "d-1",
        decision: "MODIFIED",
        approvalPolicy: { fourEyesEnabled: true },
        acceptedSnapshot: {
          canonicalId: "ECCN:9A515.a.1",
          regime: "EU-ANNEX-I",
          confidence: "LOW",
          overrideSource: "BAFA AzG",
        },
      }),
    ).rejects.toThrow(/requires a justification/);
  });

  it("REJECTS a MODIFIED decision with no edited code", async () => {
    pendingDraftAuthoredBy("author-1");
    await expect(
      recordDecision(approver, {
        draftId: "d-1",
        decision: "MODIFIED",
        approvalPolicy: { fourEyesEnabled: true },
        acceptedSnapshot: {
          canonicalId: "",
          regime: "EU-ANNEX-I",
          confidence: "LOW",
          overrideSource: "BAFA AzG",
          overrideJustification: "reason",
        },
      }),
    ).rejects.toThrow(/control code/);
  });
});

describe("listDrafts + getDraft — org-scope enforcement", () => {
  it("listDrafts always scopes by organizationId", async () => {
    mockPrisma.tradeItemClassificationDraft.findMany.mockResolvedValue([]);

    await listDrafts(scope, { decision: "PENDING" });

    const args =
      mockPrisma.tradeItemClassificationDraft.findMany.mock.calls[0][0];
    expect(args.where.organizationId).toBe("org-1");
    expect(args.where.decision).toBe("PENDING");
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("getDraft returns null when the draft belongs to another org", async () => {
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue(null);
    const result = await getDraft(scope, "d-other-org");
    expect(result).toBeNull();
    const args =
      mockPrisma.tradeItemClassificationDraft.findFirst.mock.calls[0][0];
    expect(args.where.organizationId).toBe("org-1");
  });
});

describe("truncateRawText", () => {
  it("returns null on null input", () => {
    expect(truncateRawText(null)).toBeNull();
  });

  it("returns the input unchanged when under the cap", () => {
    expect(truncateRawText("short")).toBe("short");
  });

  it("truncates strings over the cap and appends a marker", () => {
    const big = "a".repeat(RAW_TEXT_SNAPSHOT_CAP * 2);
    const out = truncateRawText(big);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(RAW_TEXT_SNAPSHOT_CAP);
    expect(out!.endsWith("[truncated]")).toBe(true);
  });
});
