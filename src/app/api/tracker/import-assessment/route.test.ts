/**
 * Task 3.5 — import route: snapshot variant (single-source), ownership,
 * legacy back-compat, and the unknown-label 400 (never a silent SCO default).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockAuth,
  snapshotFindFirst,
  articleUpsert,
  userUpdate,
  tx,
  upsertDeadlines,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  snapshotFindFirst: vi.fn(),
  articleUpsert: vi.fn(),
  userUpdate: vi.fn(),
  tx: vi.fn(async (ops: unknown[]) => ops),
  upsertDeadlines: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentVerdictSnapshot: { findFirst: snapshotFindFirst },
    articleStatus: { upsert: articleUpsert },
    user: { update: userUpdate },
    $transaction: tx,
  },
}));
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn(() => ({ ipAddress: "1.2.3.4", userAgent: "t" })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/assessment/roadmap-deadlines.server", () => ({
  upsertRoadmapDeadlines: upsertDeadlines,
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/tracker/import-assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  upsertDeadlines.mockResolvedValue({
    created: 2,
    updated: 0,
    skippedContested: 1,
  });
});

describe("snapshot variant (single-source import)", () => {
  it("imports from the snapshot's module statuses + wires roadmap deadlines", async () => {
    snapshotFindFirst.mockResolvedValue({
      id: "snap-1",
      result: {
        spaceActModules: [{ id: "authorization", status: "required" }],
        roadmap: [
          {
            due: "2026-08-01",
            action: "x",
            basis: [
              { label: "l", citation: "c", asOf: "2025-06-25", verified: true },
            ],
          },
        ],
      },
      profile: { id: "profile-1", userId: "user-1" },
    });

    const res = await POST(req({ verdictSnapshotId: "snap-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(true);
    expect(typeof body.articles).toBe("number");
    expect(body.deadlines).toBe(2);
    expect(upsertDeadlines).toHaveBeenCalledWith(
      "user-1",
      "profile-1",
      expect.any(Array),
    );
    expect(tx).toHaveBeenCalledTimes(1);
  });

  it("foreign snapshot → 404 (ownership), nothing written", async () => {
    snapshotFindFirst.mockResolvedValue({
      id: "snap-2",
      result: { spaceActModules: [] },
      profile: { id: "profile-2", userId: "someone-else" },
    });
    const res = await POST(req({ verdictSnapshotId: "snap-2" }));
    expect(res.status).toBe(404);
    expect(tx).not.toHaveBeenCalled();
    expect(upsertDeadlines).not.toHaveBeenCalled();
  });

  it("snapshot without module statuses → 422 (never guess applicability)", async () => {
    snapshotFindFirst.mockResolvedValue({
      id: "snap-3",
      result: {},
      profile: { id: "profile-1", userId: "user-1" },
    });
    const res = await POST(req({ verdictSnapshotId: "snap-3" }));
    expect(res.status).toBe(422);
    expect(tx).not.toHaveBeenCalled();
  });
});

describe("legacy variant (back-compat + hardening)", () => {
  it("known operator type keeps working unchanged", async () => {
    const res = await POST(req({ operatorType: "spacecraft_operator" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applicable).toBeGreaterThan(0);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { operatorType: "SCO" } }),
    );
  });

  it("unknown operator label → 400, never a silent default", async () => {
    const res = await POST(req({ operatorType: "atlantis_operator" }));
    expect(res.status).toBe(400);
    expect(tx).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("unauthenticated → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req({ operatorType: "spacecraft_operator" }));
    expect(res.status).toBe(401);
  });
});
