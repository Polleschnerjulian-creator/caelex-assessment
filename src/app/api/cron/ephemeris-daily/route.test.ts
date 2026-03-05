import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks (must be before import) ──────────────────────────────────────────

vi.mock("@/lib/prisma", () => {
  const prisma: Record<string, any> = {
    organization: { findMany: vi.fn() },
    satelliteComplianceState: { upsert: vi.fn() },
    satelliteComplianceStateHistory: { create: vi.fn() },
    satelliteAlert: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return { prisma };
});

vi.mock("@/lib/ephemeris/core/satellite-compliance-state", () => ({
  calculateSatelliteComplianceState: vi.fn(),
}));

vi.mock("@/lib/ephemeris/core/types", () => ({
  toPublicState: vi.fn((s: unknown) => s),
}));

vi.mock("@/lib/services/notification-service", () => ({
  notifyOrganization: vi.fn(),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { notifyOrganization } from "@/lib/services/notification-service";

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  organization: { findMany: ReturnType<typeof vi.fn> };
  satelliteComplianceState: { upsert: ReturnType<typeof vi.fn> };
  satelliteComplianceStateHistory: { create: ReturnType<typeof vi.fn> };
  satelliteAlert: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockCalc = calculateSatelliteComplianceState as ReturnType<typeof vi.fn>;
const mockNotify = notifyOrganization as ReturnType<typeof vi.fn>;

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/cron/ephemeris-daily", {
    method: "GET",
    headers,
  });
}

/** Minimal state object satisfying the shape used by the route */
function makeState(overrides: Record<string, any> = {}) {
  return {
    overallScore: 85,
    dataFreshness: "LIVE" as const,
    complianceHorizon: {
      daysUntilFirstBreach: null as number | null,
      firstBreachRegulation: null as string | null,
    },
    modules: {} as Record<
      string,
      {
        status: string;
        score: number;
        factors: Array<{ regulationRef?: string | null }>;
      }
    >,
    ...overrides,
  };
}

const VALID_SECRET = "test-cron-secret";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ephemeris-daily cron route", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CRON_SECRET;
    vi.clearAllMocks();
    // Default: no orgs (empty result for most tests)
    mockPrisma.organization.findMany.mockResolvedValue([]);
    mockPrisma.satelliteAlert.findMany.mockResolvedValue([]);
    mockPrisma.satelliteAlert.create.mockResolvedValue({});
    mockPrisma.satelliteAlert.update.mockResolvedValue({});
    mockPrisma.satelliteComplianceState.upsert.mockResolvedValue({});
    mockPrisma.satelliteComplianceStateHistory.create.mockResolvedValue({});
    mockNotify.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalEnv;
    }
  });

  // ── isValidCronSecret (indirectly via GET auth checks) ──────────────────

  describe("isValidCronSecret (via auth)", () => {
    it("validates with timing-safe comparison when secret matches", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const req = makeRequest(`Bearer ${VALID_SECRET}`);
      const res = await GET(req);
      // Should NOT be 401 or 503
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(503);
    });

    it("rejects wrong secret", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const req = makeRequest("Bearer wrong-secret");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // ── GET: Auth & Config ──────────────────────────────────────────────────

  describe("GET: auth & config", () => {
    it("returns 503 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer anything"));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toContain("not configured");
    });

    it("returns 401 when auth header is wrong", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const res = await GET(makeRequest("Bearer bad"));
      expect(res.status).toBe(401);
    });

    it("returns 401 when auth header is missing", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  // ── GET: Processing ─────────────────────────────────────────────────────

  describe("GET: processing", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("processes all organizations with spacecraft", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "25544", name: "ISS", launchDate: null }],
        },
        {
          id: "org-2",
          spacecraft: [
            { noradId: "43013", name: "Starlink-1", launchDate: null },
          ],
        },
      ]);
      mockCalc.mockResolvedValue(makeState());

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(2);
      expect(mockCalc).toHaveBeenCalledTimes(2);
    });

    it("filters satellites that have noradId", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [
            { noradId: "25544", name: "ISS", launchDate: null },
            { noradId: null, name: "No-NORAD", launchDate: null },
          ],
        },
      ]);
      mockCalc.mockResolvedValue(makeState());

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(body.processed).toBe(1);
      expect(mockCalc).toHaveBeenCalledTimes(1);
      expect(mockCalc).toHaveBeenCalledWith(
        expect.objectContaining({ noradId: "25544" }),
      );
    });

    it("calls calculateSatelliteComplianceState for each satellite", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [
            {
              noradId: "11111",
              name: "Sat-A",
              launchDate: new Date("2020-01-01"),
            },
            { noradId: "22222", name: "Sat-B", launchDate: null },
          ],
        },
      ]);
      mockCalc.mockResolvedValue(makeState());

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockCalc).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-1",
          noradId: "11111",
          satelliteName: "Sat-A",
        }),
      );
      expect(mockCalc).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-1",
          noradId: "22222",
          satelliteName: "Sat-B",
        }),
      );
    });

    it("persists state (upsert), appends to history, processes alerts", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "25544", name: "ISS", launchDate: null }],
        },
      ]);
      const state = makeState({ overallScore: 72 });
      mockCalc.mockResolvedValue(state);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // Upsert state
      expect(mockPrisma.satelliteComplianceState.upsert).toHaveBeenCalledTimes(
        1,
      );
      expect(mockPrisma.satelliteComplianceState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            noradId_operatorId: { noradId: "25544", operatorId: "org-1" },
          },
        }),
      );

      // Append history
      expect(
        mockPrisma.satelliteComplianceStateHistory.create,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPrisma.satelliteComplianceStateHistory.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noradId: "25544",
            operatorId: "org-1",
            overallScore: 72,
          }),
        }),
      );

      // Alert processing triggered (findMany for existing alerts)
      expect(mockPrisma.satelliteAlert.findMany).toHaveBeenCalledTimes(1);
    });

    it("handles individual satellite errors without failing batch", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [
            { noradId: "11111", name: "Sat-A", launchDate: null },
            { noradId: "22222", name: "Sat-B", launchDate: null },
          ],
        },
      ]);
      // First call throws, second succeeds
      mockCalc
        .mockRejectedValueOnce(new Error("TLE fetch failed"))
        .mockResolvedValueOnce(makeState());

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0]).toContain("11111");
    });

    it("returns success response with correct counts", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [
            { noradId: "11111", name: "Sat-A", launchDate: null },
            { noradId: "22222", name: "Sat-B", launchDate: null },
          ],
        },
      ]);
      const state = makeState({
        modules: {
          debris: {
            status: "NON_COMPLIANT",
            score: 20,
            factors: [{ regulationRef: "Art.5" }],
          },
        },
      });
      mockCalc.mockResolvedValue(state);

      // First satellite: no existing alerts -> 1 new alert created
      // Second satellite: has existing alert with same key -> no new alert
      mockPrisma.satelliteAlert.findMany
        .mockResolvedValueOnce([]) // first satellite has no existing alerts
        .mockResolvedValueOnce([]); // second satellite has no existing alerts

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(2);
      expect(body.alertsCreated).toBe(2);
      expect(body.alertsResolved).toBe(0);
      expect(body).toHaveProperty("processedAt");
      expect(body).toHaveProperty("durationMs");
    });
  });

  // ── Alert Hysteresis ────────────────────────────────────────────────────

  describe("alert hysteresis", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("creates new alert for non-compliant module", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "25544", name: "ISS", launchDate: null }],
        },
      ]);
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            cybersecurity: {
              status: "NON_COMPLIANT",
              score: 10,
              factors: [{ regulationRef: "Art.21" }],
            },
          },
        }),
      );
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([]);

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(body.alertsCreated).toBe(1);
      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noradId: "25544",
            operatorId: "org-1",
            type: "COMPLIANCE_ACTION_REQUIRED",
            severity: "CRITICAL",
            dedupeKey: "25544_NON_COMPLIANT_cybersecurity",
          }),
        }),
      );
    });

    it("upgrades severity when condition worsens", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "25544", name: "ISS", launchDate: null }],
        },
      ]);
      // Module is now NON_COMPLIANT (CRITICAL) but existing alert is HIGH
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            debris: {
              status: "NON_COMPLIANT",
              score: 5,
              factors: [{ regulationRef: "Art.5" }],
            },
          },
        }),
      );
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "alert-1",
          dedupeKey: "25544_NON_COMPLIANT_debris",
          severity: "HIGH",
          type: "COMPLIANCE_SCORE_DROPPED",
        },
      ]);

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      // Severity upgraded from HIGH->CRITICAL via update, not a new create
      expect(mockPrisma.satelliteAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alert-1" },
          data: expect.objectContaining({ severity: "CRITICAL" }),
        }),
      );
      expect(body.alertsCreated).toBe(0);
    });

    it("resolves alerts when condition clears", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "25544", name: "ISS", launchDate: null }],
        },
      ]);
      // State is fully compliant now (no alerts generated)
      mockCalc.mockResolvedValue(makeState());
      // But there are existing active alerts
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "alert-old-1",
          dedupeKey: "25544_NON_COMPLIANT_debris",
          severity: "CRITICAL",
          type: "COMPLIANCE_ACTION_REQUIRED",
        },
      ]);

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(body.alertsResolved).toBe(1);
      expect(mockPrisma.satelliteAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alert-old-1" },
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        }),
      );
    });
  });

  // ── Alert Deduplication ─────────────────────────────────────────────────

  describe("alert deduplication", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("uses dedupeKey = noradId + type + module", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "99999", name: "TestSat", launchDate: null }],
        },
      ]);
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            cybersecurity: {
              status: "NON_COMPLIANT",
              score: 10,
              factors: [{ regulationRef: "Art.21" }],
            },
            debris: {
              status: "WARNING",
              score: 55,
              factors: [{ regulationRef: "Art.5" }],
            },
          },
        }),
      );
      // Existing alert matches one of the conditions
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "alert-existing",
          dedupeKey: "99999_NON_COMPLIANT_cybersecurity",
          severity: "CRITICAL",
          type: "COMPLIANCE_ACTION_REQUIRED",
        },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // cybersecurity already exists with same severity -> no create, no update
      // debris is new -> create
      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dedupeKey: "99999_WARNING_debris",
          }),
        }),
      );
    });
  });

  // ── generateAlertConditions (tested via GET integration) ────────────────

  describe("generateAlertConditions", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [
            { noradId: "55555", name: "AlertSat", launchDate: null },
          ],
        },
      ]);
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([]);
    });

    it("creates CRITICAL for NON_COMPLIANT modules", async () => {
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            registration: {
              status: "NON_COMPLIANT",
              score: 0,
              factors: [{ regulationRef: "Art.8" }],
            },
          },
        }),
      );

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "CRITICAL",
            type: "COMPLIANCE_ACTION_REQUIRED",
          }),
        }),
      );
    });

    it("creates HIGH for WARNING modules", async () => {
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            insurance: {
              status: "WARNING",
              score: 60,
              factors: [{ regulationRef: "Art.12" }],
            },
          },
        }),
      );

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "HIGH",
            type: "COMPLIANCE_SCORE_DROPPED",
          }),
        }),
      );
    });

    it("creates horizon alert CRITICAL when < 30 days", async () => {
      mockCalc.mockResolvedValue(
        makeState({
          complianceHorizon: {
            daysUntilFirstBreach: 15,
            firstBreachRegulation: "Art.5",
          },
        }),
      );

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "CRITICAL",
            type: "HORIZON_SHORTENED",
            dedupeKey: "55555_HORIZON_CRITICAL",
          }),
        }),
      );
    });

    it("creates horizon alert HIGH when < 90 days", async () => {
      mockCalc.mockResolvedValue(
        makeState({
          complianceHorizon: {
            daysUntilFirstBreach: 60,
            firstBreachRegulation: "Art.10",
          },
        }),
      );

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "HIGH",
            type: "HORIZON_SHORTENED",
            dedupeKey: "55555_HORIZON_HIGH",
          }),
        }),
      );
    });

    it("creates data staleness alert for STALE (MEDIUM)", async () => {
      mockCalc.mockResolvedValue(makeState({ dataFreshness: "STALE" }));

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "MEDIUM",
            type: "DATA_STALE",
            dedupeKey: "55555_DATA_STALE",
          }),
        }),
      );
    });

    it("creates data staleness alert for NO_DATA (HIGH)", async () => {
      mockCalc.mockResolvedValue(makeState({ dataFreshness: "NO_DATA" }));

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "HIGH",
            type: "DATA_STALE",
            dedupeKey: "55555_DATA_STALE",
          }),
        }),
      );
    });
  });

  // ── severityRank (tested indirectly via upgrade logic) ──────────────────

  describe("severityRank", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: "org-1",
          spacecraft: [{ noradId: "77777", name: "RankSat", launchDate: null }],
        },
      ]);
    });

    it("CRITICAL(4) > HIGH(3) triggers upgrade", async () => {
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            debris: {
              status: "NON_COMPLIANT",
              score: 5,
              factors: [{ regulationRef: "Art.5" }],
            },
          },
        }),
      );
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "a1",
          dedupeKey: "77777_NON_COMPLIANT_debris",
          severity: "HIGH",
          type: "COMPLIANCE_SCORE_DROPPED",
        },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.satelliteAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "a1" },
          data: expect.objectContaining({ severity: "CRITICAL" }),
        }),
      );
    });

    it("MEDIUM(2) does not upgrade to MEDIUM (same rank, no update)", async () => {
      // STALE creates MEDIUM alert; if existing is already MEDIUM, no upgrade
      mockCalc.mockResolvedValue(makeState({ dataFreshness: "STALE" }));
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "a2",
          dedupeKey: "77777_DATA_STALE",
          severity: "MEDIUM",
          type: "DATA_STALE",
        },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // No create (already exists), no update (same severity)
      expect(mockPrisma.satelliteAlert.create).not.toHaveBeenCalled();
      // update should not be called for severity upgrade (but may be called
      // for other resolved alerts -- here there are none)
      // The existing alert is consumed by the matching dedupeKey, so no resolve either.
      expect(mockPrisma.satelliteAlert.update).not.toHaveBeenCalled();
    });

    it("LOW(1) < HIGH(3) does not trigger downgrade update", async () => {
      // WARNING module generates HIGH alert; existing alert is CRITICAL
      // 3 < 4 means no upgrade
      mockCalc.mockResolvedValue(
        makeState({
          modules: {
            debris: {
              status: "WARNING",
              score: 55,
              factors: [{ regulationRef: "Art.5" }],
            },
          },
        }),
      );
      mockPrisma.satelliteAlert.findMany.mockResolvedValue([
        {
          id: "a3",
          dedupeKey: "77777_WARNING_debris",
          severity: "CRITICAL",
          type: "COMPLIANCE_ACTION_REQUIRED",
        },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // No create (already exists), no severity upgrade (HIGH < CRITICAL)
      expect(mockPrisma.satelliteAlert.create).not.toHaveBeenCalled();
      expect(mockPrisma.satelliteAlert.update).not.toHaveBeenCalled();
    });
  });

  // ── POST delegates to GET ───────────────────────────────────────────────

  describe("POST", () => {
    it("delegates to GET", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const req = makeRequest(`Bearer ${VALID_SECRET}`);
      const res = await POST(req);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 503 when CRON_SECRET not set (same as GET)", async () => {
      delete process.env.CRON_SECRET;
      const req = makeRequest("Bearer anything");
      const res = await POST(req);
      expect(res.status).toBe(503);
    });
  });
});
