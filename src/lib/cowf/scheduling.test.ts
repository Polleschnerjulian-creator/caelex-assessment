/**
 * Scheduling service — unit tests.
 *
 * Coverage:
 *
 *   1. createSchedule writes a PENDING row
 *   2. cancelSchedule flips PENDING → CANCELLED
 *   3. cancelSchedule is idempotent on already-FIRED rows
 *   4. cancelSchedulesForStep flips all matching PENDING rows
 *   5. listDueSchedules returns rows where fireAt <= now AND status=PENDING
 *   6. listDueSchedules excludes rows that hit MAX_SCHEDULE_ATTEMPTS
 *   7. markScheduleFired flips PENDING → FIRED + sets firedAt
 *   8. markScheduleFired no-ops on already-FIRED rows
 *   9. recordScheduleFailure increments attemptCount
 *  10. recordScheduleFailure flips to FAILED at the cap
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSchedule } = vi.hoisted(() => ({
  mockSchedule: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: { workflowSchedule: mockSchedule },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  cancelSchedule,
  cancelSchedulesForStep,
  createSchedule,
  listDueSchedules,
  markScheduleFired,
  MAX_SCHEDULE_ATTEMPTS,
  recordScheduleFailure,
} from "./scheduling.server";

const WF_ID = "wf_1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSchedule", () => {
  it("creates a PENDING row at the requested fireAt", async () => {
    const fireAt = new Date("2026-12-01T00:00:00Z");
    mockSchedule.create.mockResolvedValue({ id: "sch_1", fireAt });
    const result = await createSchedule({
      workflowId: WF_ID,
      stepKey: "wait-for-x",
      fireAt,
    });
    expect(result.id).toBe("sch_1");
    expect(mockSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: WF_ID,
          stepKey: "wait-for-x",
          fireAt,
          status: "PENDING",
        }),
      }),
    );
  });
});

describe("cancelSchedule", () => {
  it("returns cancelled:true when PENDING row was flipped", async () => {
    mockSchedule.updateMany.mockResolvedValue({ count: 1 });
    const result = await cancelSchedule("sch_1", "superseded");
    expect(result.cancelled).toBe(true);
    expect(mockSchedule.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sch_1", status: "PENDING" },
        data: expect.objectContaining({
          status: "CANCELLED",
          lastError: "superseded",
        }),
      }),
    );
  });

  it("returns cancelled:false when row was already FIRED (no-op)", async () => {
    mockSchedule.updateMany.mockResolvedValue({ count: 0 });
    const result = await cancelSchedule("sch_already_fired");
    expect(result.cancelled).toBe(false);
  });
});

describe("cancelSchedulesForStep", () => {
  it("flips all matching PENDING rows", async () => {
    mockSchedule.updateMany.mockResolvedValue({ count: 3 });
    const result = await cancelSchedulesForStep(WF_ID, "wait-for-x");
    expect(result.cancelled).toBe(3);
    expect(mockSchedule.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workflowId: WF_ID, stepKey: "wait-for-x", status: "PENDING" },
      }),
    );
  });
});

describe("listDueSchedules", () => {
  it("filters by status=PENDING + fireAt<=now + attemptCount<MAX", async () => {
    mockSchedule.findMany.mockResolvedValue([]);
    const now = new Date("2026-04-30T10:00:00Z");
    await listDueSchedules({ now });
    expect(mockSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PENDING",
          fireAt: { lte: now },
          attemptCount: { lt: MAX_SCHEDULE_ATTEMPTS },
        },
        orderBy: [{ fireAt: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("returns the rows from prisma", async () => {
    mockSchedule.findMany.mockResolvedValue([
      {
        id: "sch_1",
        workflowId: WF_ID,
        stepKey: "x",
        fireAt: new Date(),
        attemptCount: 0,
      },
    ]);
    const rows = await listDueSchedules();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("sch_1");
  });
});

describe("markScheduleFired", () => {
  it("flips PENDING→FIRED and sets firedAt", async () => {
    mockSchedule.updateMany.mockResolvedValue({ count: 1 });
    const result = await markScheduleFired("sch_1");
    expect(result.fired).toBe(true);
    expect(mockSchedule.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sch_1", status: "PENDING" },
        data: expect.objectContaining({
          status: "FIRED",
          firedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns fired:false when no PENDING row matched", async () => {
    mockSchedule.updateMany.mockResolvedValue({ count: 0 });
    const result = await markScheduleFired("sch_already");
    expect(result.fired).toBe(false);
  });
});

describe("recordScheduleFailure", () => {
  it("increments attemptCount and stays PENDING below the cap", async () => {
    mockSchedule.findUnique.mockResolvedValue({
      attemptCount: 1,
      status: "PENDING",
    });
    mockSchedule.update.mockResolvedValue({});
    const result = await recordScheduleFailure("sch_1", "boom");
    expect(result.status).toBe("PENDING_RETRY");
    expect(mockSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sch_1" },
        data: expect.objectContaining({
          status: "PENDING",
          attemptCount: 2,
          lastError: "boom",
        }),
      }),
    );
  });

  it("flips to FAILED when nextAttempt >= MAX", async () => {
    mockSchedule.findUnique.mockResolvedValue({
      attemptCount: MAX_SCHEDULE_ATTEMPTS - 1,
      status: "PENDING",
    });
    mockSchedule.update.mockResolvedValue({});
    const result = await recordScheduleFailure("sch_1", "final boom");
    expect(result.status).toBe("FAILED");
    expect(mockSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("returns FAILED when row is missing (defensive)", async () => {
    mockSchedule.findUnique.mockResolvedValue(null);
    const result = await recordScheduleFailure("sch_gone", "x");
    expect(result.status).toBe("FAILED");
  });
});
