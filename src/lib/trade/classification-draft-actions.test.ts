/**
 * Tests for src/lib/trade/classification-draft-actions.ts — Sprint Z4d.
 *
 * Server-action layer: exercise the auth gate, schema validation, and
 * happy-path persistence by mocking prisma + auth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockPrisma,
  mockAuth,
  mockIsSuperAdmin,
  mockLogger,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockPrisma: {
    organization: { findFirst: vi.fn() },
    organizationMember: { findFirst: vi.fn() },
    tradeItem: { findFirst: vi.fn() },
    tradeItemClassificationDraft: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockIsSuperAdmin: vi.fn(),
  mockLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: mockIsSuperAdmin }));
vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import {
  generateDraftFromText,
  decideDraft,
  listDraftsForCurrentOrg,
} from "./classification-draft-actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockReturnValue(false);
});

function asMemberSession() {
  mockAuth.mockResolvedValue({
    user: { id: "user-1", email: "member@example.com" },
  });
  mockPrisma.organizationMember.findFirst.mockResolvedValue({
    organizationId: "org-1",
    role: "MEMBER",
  });
}

describe("generateDraftFromText — auth + happy path", () => {
  it("returns Not signed in when no session", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await generateDraftFromText({
      rawText: "Some sufficiently long datasheet text here.",
    });
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("rejects with fieldErrors when rawText is too short", async () => {
    asMemberSession();
    const result = await generateDraftFromText({ rawText: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Some fields are invalid");
      expect(result.fieldErrors).toHaveProperty("rawText");
    }
  });

  it("persists a draft and returns its id + primary on the happy path", async () => {
    asMemberSession();
    mockPrisma.tradeItemClassificationDraft.create.mockResolvedValue({
      id: "draft-1",
    });

    const result = await generateDraftFromText({
      // Earth-observation phrasing + sub-0.5 m aperture → USML XV(a)(7)(i)
      rawText:
        "Earth-observation satellite. Primary aperture: 0.30 m. Specially designed for spaceflight applications.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draftId).toBe("draft-1");
      // USML XV(a)(7)(i) should be the primary proposal.
      expect(result.primary).toContain("XV(a)(7)(i)");
    }
    // revalidatePath fires for the page route so the list refreshes.
    expect(mockRevalidatePath).toHaveBeenCalledWith("/trade/classify");
    // The create call carries the right org + user context.
    const args =
      mockPrisma.tradeItemClassificationDraft.create.mock.calls[0][0];
    expect(args.data.organizationId).toBe("org-1");
    expect(args.data.createdById).toBe("user-1");
  });
});

describe("decideDraft", () => {
  it("rejects unauthenticated callers", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await decideDraft({
      draftId: "d-1",
      decision: "ACCEPTED",
    });
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("forwards ACCEPTED + snapshot to recordDecision on the happy path", async () => {
    asMemberSession();
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "PENDING",
      evidence: { disclaimer: "DISCLAIMER VERBATIM" },
    });
    mockPrisma.tradeItemClassificationDraft.update.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
    });

    const result = await decideDraft({
      draftId: "d-1",
      decision: "ACCEPTED",
      acceptedSnapshot: {
        canonicalId: "USML:XV(a)(7)(i)",
        regime: "ITAR-USML",
        confidence: "HIGH",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.decision).toBe("ACCEPTED");
    }
    // The update call sets reviewer + accepted snapshot.
    const args =
      mockPrisma.tradeItemClassificationDraft.update.mock.calls[0][0];
    expect(args.data.decision).toBe("ACCEPTED");
    expect(args.data.reviewedById).toBe("user-1");
    expect(args.data.acceptedSnapshot).toBeTruthy();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/trade/classify");
  });

  it("blocks decisions on drafts that already have one", async () => {
    asMemberSession();
    mockPrisma.tradeItemClassificationDraft.findFirst.mockResolvedValue({
      id: "d-1",
      decision: "ACCEPTED",
      evidence: {},
    });

    const result = await decideDraft({
      draftId: "d-1",
      decision: "REJECTED",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already has a recorded decision/);
    }
  });
});

describe("listDraftsForCurrentOrg", () => {
  it("scopes to the resolved org", async () => {
    asMemberSession();
    mockPrisma.tradeItemClassificationDraft.findMany.mockResolvedValue([]);

    await listDraftsForCurrentOrg();

    const args =
      mockPrisma.tradeItemClassificationDraft.findMany.mock.calls[0][0];
    expect(args.where.organizationId).toBe("org-1");
  });
});
