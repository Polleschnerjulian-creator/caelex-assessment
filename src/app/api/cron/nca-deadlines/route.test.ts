import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Set env BEFORE module load ───
const CRON_SECRET = "test-cron-secret-value";
vi.hoisted(() => {
  process.env.CRON_SECRET = "test-cron-secret-value";
});

// ─── Mocks ───

const mockNCASubmissionFindMany = vi.fn().mockResolvedValue([]);
const mockIncidentNIS2PhaseFindMany = vi.fn().mockResolvedValue([]);
const mockIncidentNIS2PhaseUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nCASubmission: {
      findMany: (...args: unknown[]) => mockNCASubmissionFindMany(...args),
    },
    incidentNIS2Phase: {
      findMany: (...args: unknown[]) => mockIncidentNIS2PhaseFindMany(...args),
      update: (...args: unknown[]) => mockIncidentNIS2PhaseUpdate(...args),
    },
  },
}));

const mockNotifyUser = vi.fn();
vi.mock("@/lib/services/notification-service", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

const mockProcessBreachEscalations = vi.fn().mockResolvedValue({
  escalated: 0,
  errors: [],
});
vi.mock("@/lib/services/breach-notification-service", () => ({
  processBreachEscalations: (...args: unknown[]) =>
    mockProcessBreachEscalations(...args),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Import route ───
import { GET, POST } from "./route";

// ─── Helpers ───

function createRequest(options: {
  withAuth?: boolean;
  secret?: string;
}): Request {
  const headers: Record<string, string> = {};
  if (options.withAuth) {
    headers["authorization"] = `Bearer ${options.secret || CRON_SECRET}`;
  }
  return new Request("http://localhost/api/cron/nca-deadlines", {
    method: "GET",
    headers,
  });
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    userId: "user-1",
    ncaAuthorityName: "BSI",
    followUpDeadline: null,
    followUpRequired: false,
    slaDeadline: null,
    submittedAt: new Date("2026-01-01"),
    updatedAt: new Date(),
    status: "SUBMITTED",
    ...overrides,
  };
}

function makePhase(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "phase-1",
    phase: "initial_notification",
    status: "pending",
    deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48h from now
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24h ago
    incident: {
      id: "inc-1",
      incidentNumber: "INC-001",
      title: "Test Incident",
      supervision: { userId: "user-1" },
    },
    ...overrides,
  };
}

// ─── Tests ───

describe("Cron: nca-deadlines", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET };

    mockNCASubmissionFindMany.mockResolvedValue([]);
    mockIncidentNIS2PhaseFindMany.mockResolvedValue([]);
    mockIncidentNIS2PhaseUpdate.mockResolvedValue(undefined);
    mockNotifyUser.mockResolvedValue(undefined);
    mockProcessBreachEscalations.mockResolvedValue({
      escalated: 0,
      errors: [],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ═══════════════════════════════════════
  // Authentication
  // ═══════════════════════════════════════

  describe("GET authentication", () => {
    it("returns 401 when no auth header", async () => {
      const req = createRequest({});
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when auth header is wrong", async () => {
      const req = createRequest({ withAuth: true, secret: "wrong-secret" });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 503 when CRON_SECRET not configured", async () => {
      vi.resetModules();
      const savedSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          nCASubmission: { findMany: vi.fn().mockResolvedValue([]) },
          incidentNIS2Phase: {
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
        },
      }));
      vi.doMock("@/lib/services/notification-service", () => ({
        notifyUser: vi.fn(),
      }));
      vi.doMock("@/lib/services/breach-notification-service", () => ({
        processBreachEscalations: vi
          .fn()
          .mockResolvedValue({ escalated: 0, errors: [] }),
      }));
      vi.doMock("@/lib/validations", () => ({
        getSafeErrorMessage: vi.fn(
          (_err: unknown, fallback: string) => fallback,
        ),
      }));
      vi.doMock("@/lib/logger", () => ({
        logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      }));

      const { GET: FreshGET } = await import("./route");

      const req = new Request("http://localhost/api/cron/nca-deadlines", {
        method: "GET",
      });
      const res = await FreshGET(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toContain("cron authentication not configured");

      process.env.CRON_SECRET = savedSecret;
    });
  });

  // ═══════════════════════════════════════
  // Approaching deadlines (within 3 days)
  // ═══════════════════════════════════════

  describe("approaching deadlines", () => {
    it("finds approaching deadlines (within 3 days) and notifies", async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      // First call: approaching deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-approaching",
          followUpDeadline: twoDaysFromNow,
        }),
      ]);
      // Second call: overdue follow-ups
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Third call: stale submissions
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Fourth call: SLA deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationsSent).toBeGreaterThanOrEqual(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "NCA_DEADLINE_APPROACHING",
        expect.stringContaining("Follow-up deadline in"),
        expect.stringContaining("BSI"),
        expect.objectContaining({
          entityType: "nca_submission",
          entityId: "sub-approaching",
        }),
      );
    });
  });

  // ═══════════════════════════════════════
  // Overdue follow-ups
  // ═══════════════════════════════════════

  describe("overdue follow-ups", () => {
    it("finds overdue follow-ups and notifies with URGENT severity", async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // First call: approaching deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Second call: overdue follow-ups
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-overdue",
          followUpRequired: true,
          followUpDeadline: twoDaysAgo,
        }),
      ]);
      // Third call: stale submissions
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Fourth call: SLA deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notificationsSent).toBeGreaterThanOrEqual(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "NCA_FOLLOW_UP_REQUIRED",
        expect.stringContaining("Overdue follow-up"),
        expect.stringContaining("overdue"),
        expect.objectContaining({
          severity: "URGENT",
          entityType: "nca_submission",
          entityId: "sub-overdue",
        }),
      );
    });
  });

  // ═══════════════════════════════════════
  // Stale SUBMITTED submissions (>14 days)
  // ═══════════════════════════════════════

  describe("stale submissions", () => {
    it("finds stale SUBMITTED submissions (>14 days) and notifies", async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

      // First call: approaching deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Second call: overdue follow-ups
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Third call: stale submissions
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-stale",
          status: "SUBMITTED",
          submittedAt: twentyDaysAgo,
          updatedAt: twentyDaysAgo,
        }),
      ]);
      // Fourth call: SLA deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notificationsSent).toBeGreaterThanOrEqual(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "NCA_STATUS_CHANGED",
        expect.stringContaining("No response from BSI"),
        expect.stringContaining("pending for"),
        expect.objectContaining({
          entityType: "nca_submission",
          entityId: "sub-stale",
        }),
      );
    });
  });

  // ═══════════════════════════════════════
  // SLA deadline approaching
  // ═══════════════════════════════════════

  describe("SLA deadlines", () => {
    it("finds SLA deadlines approaching and notifies", async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      // First call: approaching deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Second call: overdue follow-ups
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Third call: stale submissions
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // Fourth call: SLA deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-sla",
          slaDeadline: twoDaysFromNow,
        }),
      ]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notificationsSent).toBeGreaterThanOrEqual(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "NCA_DEADLINE_APPROACHING",
        expect.stringContaining("SLA deadline approaching"),
        expect.stringContaining("SLA deadline"),
        expect.objectContaining({
          entityType: "nca_submission",
          entityId: "sub-sla",
        }),
      );
    });
  });

  // ═══════════════════════════════════════
  // Breach escalations
  // ═══════════════════════════════════════

  describe("breach escalations", () => {
    it("processes breach escalations", async () => {
      mockProcessBreachEscalations.mockResolvedValue({
        escalated: 3,
        errors: [],
      });

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.breachEscalations).toBe(3);
      expect(mockProcessBreachEscalations).toHaveBeenCalledTimes(1);
    });

    it("handles breach escalation failure gracefully", async () => {
      mockProcessBreachEscalations.mockRejectedValue(
        new Error("Breach processing failed"),
      );

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      // Should not fail the whole cron job
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errorCount).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════
  // Incident NIS2 phase monitoring
  // ═══════════════════════════════════════

  describe("incident NIS2 phase monitoring", () => {
    it("monitors overdue phases — updates status and sends URGENT notification", async () => {
      const now = new Date();
      const overduePhase = makePhase({
        id: "phase-overdue",
        deadline: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h ago
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48h ago
      });

      mockIncidentNIS2PhaseFindMany.mockResolvedValue([overduePhase]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.incidentPhaseNotifications).toBe(1);

      // Should update phase status to overdue
      expect(mockIncidentNIS2PhaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "phase-overdue" },
          data: { status: "overdue" },
        }),
      );

      // Should notify with URGENT severity
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "INCIDENT_DEADLINE_OVERDUE",
        expect.stringContaining("OVERDUE"),
        expect.stringContaining("overdue"),
        expect.objectContaining({
          severity: "URGENT",
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("monitors critical phases (< 2 hours remaining)", async () => {
      const now = new Date();
      const criticalPhase = makePhase({
        id: "phase-critical",
        deadline: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1h from now
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72h ago
      });

      mockIncidentNIS2PhaseFindMany.mockResolvedValue([criticalPhase]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.incidentPhaseNotifications).toBe(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "INCIDENT_DEADLINE_CRITICAL",
        expect.stringContaining("CRITICAL"),
        expect.stringContaining("imminent"),
        expect.objectContaining({
          severity: "CRITICAL",
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("monitors warning phases (< 25% time remaining)", async () => {
      const now = new Date();
      // Total window: 100h, remaining: 20h (~20% remaining)
      const warningPhase = makePhase({
        id: "phase-warning",
        deadline: new Date(now.getTime() + 20 * 60 * 60 * 1000), // 20h from now
        createdAt: new Date(now.getTime() - 80 * 60 * 60 * 1000), // 80h ago
      });

      mockIncidentNIS2PhaseFindMany.mockResolvedValue([warningPhase]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.incidentPhaseNotifications).toBe(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "INCIDENT_DEADLINE_WARNING",
        expect.stringContaining("deadline approaching"),
        expect.stringContaining("25%"),
        expect.objectContaining({
          severity: "WARNING",
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("monitors info phases (< 50% time remaining)", async () => {
      const now = new Date();
      // Total window: 100h, remaining: 40h (~40% remaining)
      const infoPhase = makePhase({
        id: "phase-info",
        deadline: new Date(now.getTime() + 40 * 60 * 60 * 1000), // 40h from now
        createdAt: new Date(now.getTime() - 60 * 60 * 60 * 1000), // 60h ago
      });

      mockIncidentNIS2PhaseFindMany.mockResolvedValue([infoPhase]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.incidentPhaseNotifications).toBe(1);
      expect(mockNotifyUser).toHaveBeenCalledWith(
        "user-1",
        "INCIDENT_DEADLINE_WARNING",
        expect.stringContaining("reminder"),
        expect.stringContaining("halfway"),
        expect.objectContaining({
          entityType: "incident",
          entityId: "inc-1",
        }),
      );
    });

    it("does not notify when > 50% time remaining", async () => {
      const now = new Date();
      // Total window: 100h, remaining: 70h (~70% remaining)
      const earlyPhase = makePhase({
        id: "phase-early",
        deadline: new Date(now.getTime() + 70 * 60 * 60 * 1000), // 70h from now
        createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000), // 30h ago
      });

      mockIncidentNIS2PhaseFindMany.mockResolvedValue([earlyPhase]);

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.incidentPhaseNotifications).toBe(0);
      expect(mockNotifyUser).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════
  // Success response counts
  // ═══════════════════════════════════════

  describe("response structure", () => {
    it("returns success response with correct notification counts", async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Approaching deadline
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-1",
          followUpDeadline: twoDaysFromNow,
        }),
      ]);
      // Overdue follow-up
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-2",
          followUpRequired: true,
          followUpDeadline: twoDaysAgo,
        }),
      ]);
      // Stale submissions
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);
      // SLA deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([]);

      mockProcessBreachEscalations.mockResolvedValue({
        escalated: 1,
        errors: [],
      });

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationsSent).toBe(2);
      expect(data.breachEscalations).toBe(1);
      expect(data.incidentPhaseNotifications).toBe(0);
      expect(data.errorCount).toBe(0);
      expect(data.duration).toBeDefined();
      expect(data.processedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════

  describe("error handling", () => {
    it("handles individual notification errors without failing", async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      // Approaching deadlines
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-notify-fail",
          followUpDeadline: twoDaysFromNow,
        }),
      ]);
      // Remaining queries return empty
      mockNCASubmissionFindMany.mockResolvedValue([]);

      // Notification fails for the first submission
      mockNotifyUser.mockRejectedValueOnce(new Error("Notification failed"));

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      // Should still succeed overall
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errorCount).toBeGreaterThan(0);
    });

    it("handles query-level errors gracefully", async () => {
      // All NCA queries throw
      mockNCASubmissionFindMany.mockRejectedValue(new Error("Query failed"));

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      // Should still succeed overall with errors logged
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errorCount).toBeGreaterThan(0);
    });

    it("handles empty dataset gracefully", async () => {
      // All queries return empty arrays (default mock behavior)
      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationsSent).toBe(0);
      expect(data.breachEscalations).toBe(0);
      expect(data.incidentPhaseNotifications).toBe(0);
      expect(data.errorCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════
  // POST delegates to GET
  // ═══════════════════════════════════════

  describe("POST", () => {
    it("delegates to GET", async () => {
      const req = createRequest({ withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("rejects unauthorized POST requests", async () => {
      const req = createRequest({});
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // ═══════════════════════════════════════
  // Multiple notification types in single run
  // ═══════════════════════════════════════

  describe("combined scenarios", () => {
    it("processes all notification types in a single run", async () => {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      // 1. Approaching deadline
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-approach",
          followUpDeadline: twoDaysFromNow,
        }),
      ]);
      // 2. Overdue follow-up
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-overdue",
          followUpRequired: true,
          followUpDeadline: threeDaysAgo,
        }),
      ]);
      // 3. Stale submission
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-stale",
          submittedAt: twentyDaysAgo,
        }),
      ]);
      // 4. SLA approaching
      mockNCASubmissionFindMany.mockResolvedValueOnce([
        makeSubmission({
          id: "sub-sla",
          slaDeadline: twoDaysFromNow,
        }),
      ]);

      // Overdue incident phase
      const overduePhase = makePhase({
        id: "phase-overdue",
        deadline: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      });
      mockIncidentNIS2PhaseFindMany.mockResolvedValue([overduePhase]);

      mockProcessBreachEscalations.mockResolvedValue({
        escalated: 2,
        errors: [],
      });

      const req = createRequest({ withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationsSent).toBe(4); // 4 NCA notifications
      expect(data.breachEscalations).toBe(2);
      expect(data.incidentPhaseNotifications).toBe(1); // 1 overdue phase
      expect(data.errorCount).toBe(0);
    });
  });
});
