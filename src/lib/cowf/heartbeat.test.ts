/**
 * Heartbeat poller — unit tests.
 *
 * Coverage:
 *
 *   1. Empty due-list → tick returns 0/0/0 cleanly
 *   2. Single due schedule → emits SCHEDULE_FIRED + marks FIRED
 *   3. Multiple due schedules → all fire independently
 *   4. appendWorkflowEvent throw → recordScheduleFailure called, retry queued
 *   5. After MAX retries → recordScheduleFailure returns FAILED → outcome=failed
 *   6. markScheduleFired returning fired:false (race) → still counted as fired
 *      (the event went out, the markFired was just a no-op)
 *   7. tick durationMs and tickedAt populated
 *   8. Sample arr capped at 10 entries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockListDue, mockMarkFired, mockRecordFailure, mockAppendEvent } =
  vi.hoisted(() => ({
    mockListDue: vi.fn(),
    mockMarkFired: vi.fn(),
    mockRecordFailure: vi.fn(),
    mockAppendEvent: vi.fn(),
  }));

vi.mock("server-only", () => ({}));

vi.mock("./scheduling.server", () => ({
  listDueSchedules: mockListDue,
  markScheduleFired: mockMarkFired,
  recordScheduleFailure: mockRecordFailure,
}));

vi.mock("./events.server", () => ({
  appendWorkflowEvent: mockAppendEvent,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { runHeartbeatTick } from "./heartbeat.server";
import { WorkflowEventType } from "./types";

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkFired.mockResolvedValue({ fired: true });
  mockRecordFailure.mockResolvedValue({ status: "PENDING_RETRY" });
  mockAppendEvent.mockResolvedValue({
    id: "evt_1",
    sequence: 0,
    prevHash: "g",
    entryHash: "h",
    occurredAt: new Date(),
  });
});

describe("runHeartbeatTick", () => {
  it("returns zero counts when no schedules are due", async () => {
    mockListDue.mockResolvedValue([]);
    const result = await runHeartbeatTick();
    expect(result.totalDue).toBe(0);
    expect(result.fired).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.retryQueued).toBe(0);
    expect(mockAppendEvent).not.toHaveBeenCalled();
  });

  it("emits SCHEDULE_FIRED event + marks FIRED for a due schedule", async () => {
    mockListDue.mockResolvedValue([
      {
        id: "sch_1",
        workflowId: "wf_1",
        stepKey: "wait",
        fireAt: new Date("2026-04-30T10:00:00Z"),
        attemptCount: 0,
      },
    ]);
    const result = await runHeartbeatTick();
    expect(result.fired).toBe(1);
    expect(mockAppendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "wf_1",
        eventType: WorkflowEventType.SCHEDULE_FIRED,
        causedBy: "cron:cowf-heartbeat",
        payload: expect.objectContaining({
          scheduleId: "sch_1",
          stepKey: "wait",
        }),
      }),
    );
    expect(mockMarkFired).toHaveBeenCalledWith("sch_1");
  });

  it("processes multiple due schedules independently", async () => {
    mockListDue.mockResolvedValue([
      {
        id: "sch_1",
        workflowId: "wf_1",
        stepKey: "x",
        fireAt: new Date(),
        attemptCount: 0,
      },
      {
        id: "sch_2",
        workflowId: "wf_2",
        stepKey: "y",
        fireAt: new Date(),
        attemptCount: 0,
      },
      {
        id: "sch_3",
        workflowId: "wf_3",
        stepKey: "z",
        fireAt: new Date(),
        attemptCount: 0,
      },
    ]);
    const result = await runHeartbeatTick();
    expect(result.fired).toBe(3);
    expect(mockAppendEvent).toHaveBeenCalledTimes(3);
  });

  it("records retry on appendWorkflowEvent failure", async () => {
    mockListDue.mockResolvedValue([
      {
        id: "sch_1",
        workflowId: "wf_1",
        stepKey: "x",
        fireAt: new Date(),
        attemptCount: 1,
      },
    ]);
    mockAppendEvent.mockRejectedValueOnce(new Error("DB down"));
    mockRecordFailure.mockResolvedValueOnce({ status: "PENDING_RETRY" });
    const result = await runHeartbeatTick();
    expect(result.fired).toBe(0);
    expect(result.retryQueued).toBe(1);
    expect(mockRecordFailure).toHaveBeenCalledWith("sch_1", "DB down");
  });

  it("records final failure when retry-cap reached", async () => {
    mockListDue.mockResolvedValue([
      {
        id: "sch_doomed",
        workflowId: "wf_1",
        stepKey: "x",
        fireAt: new Date(),
        attemptCount: 4,
      },
    ]);
    mockAppendEvent.mockRejectedValueOnce(new Error("forever broken"));
    mockRecordFailure.mockResolvedValueOnce({ status: "FAILED" });
    const result = await runHeartbeatTick();
    expect(result.failed).toBe(1);
    expect(result.fired).toBe(0);
  });

  it("counts as fired even when markScheduleFired no-ops (race tolerance)", async () => {
    mockListDue.mockResolvedValue([
      {
        id: "sch_1",
        workflowId: "wf_1",
        stepKey: "x",
        fireAt: new Date(),
        attemptCount: 0,
      },
    ]);
    mockMarkFired.mockResolvedValueOnce({ fired: false }); // race
    const result = await runHeartbeatTick();
    expect(result.fired).toBe(1); // event went out, that's what counts
  });

  it("populates tickedAt and durationMs", async () => {
    mockListDue.mockResolvedValue([]);
    const result = await runHeartbeatTick();
    expect(result.tickedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("caps the sample array at 10 entries even with many due", async () => {
    const due = Array.from({ length: 25 }, (_, i) => ({
      id: `sch_${i}`,
      workflowId: `wf_${i}`,
      stepKey: "x",
      fireAt: new Date(),
      attemptCount: 0,
    }));
    mockListDue.mockResolvedValue(due);
    const result = await runHeartbeatTick();
    expect(result.fired).toBe(25);
    expect(result.sample.length).toBe(10);
  });
});
