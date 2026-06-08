import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  run: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  role: { create: vi.fn() },
  sub: { upsert: vi.fn() },
  event: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scholarPlanspielRun: m.run,
    scholarPlanspielRoleAssignment: m.role,
    scholarPlanspielSubmission: m.sub,
    scholarPlanspielEvent: m.event,
  },
}));

import {
  getRunForUser,
  submitArtifact,
  advancePhase,
  createSoloRun,
} from "./runs.server";

beforeEach(() => {
  for (const group of Object.values(m)) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
});

describe("runs IDOR safety", () => {
  it("getRunForUser scopes the query to {id, ownerUserId} and returns null for another user's run", async () => {
    m.run.findFirst.mockResolvedValue(null);
    const out = await getRunForUser("user-A", "run-owned-by-B");
    expect(out).toBeNull();
    expect(m.run.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "run-owned-by-B",
          ownerUserId: "user-A",
        }),
      }),
    );
  });

  it("submitArtifact refuses + writes nothing when the caller does not own the run", async () => {
    m.run.findFirst.mockResolvedValue(null);
    const ok = await submitArtifact("user-A", "run-B", "role-1", "authority", {
      authority: "ASI",
    });
    expect(ok).toBe(false);
    expect(m.sub.upsert).not.toHaveBeenCalled();
    expect(m.event.create).not.toHaveBeenCalled();
  });

  it("submitArtifact upserts on the owned run via the compound unique key", async () => {
    m.run.findFirst.mockResolvedValue({ id: "run-A" });
    m.sub.upsert.mockResolvedValue({});
    m.event.create.mockResolvedValue({});
    const ok = await submitArtifact("user-A", "run-A", "role-1", "authority", {
      authority: "ASI",
    });
    expect(ok).toBe(true);
    expect(m.sub.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId_phaseKey_roleAssignmentId: {
            runId: "run-A",
            phaseKey: "authority",
            roleAssignmentId: "role-1",
          },
        },
      }),
    );
  });

  it("advancePhase honours optimistic locking (count 0 → false, no event)", async () => {
    m.run.updateMany.mockResolvedValue({ count: 0 });
    const ok = await advancePhase("user-A", "run-A", "application", 3, false);
    expect(ok).toBe(false);
    expect(m.run.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "run-A",
          ownerUserId: "user-A",
          version: 3,
        }),
      }),
    );
    expect(m.event.create).not.toHaveBeenCalled();
  });

  it("createSoloRun returns null for an unknown scenario (no DB write)", async () => {
    const out = await createSoloRun("user-A", "no-such-scenario");
    expect(out).toBeNull();
    expect(m.run.create).not.toHaveBeenCalled();
  });
});
