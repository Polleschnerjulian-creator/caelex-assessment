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
