/**
 * Growth Route Tests (GET /api/admin/v2/growth)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the ROUTE only (super-admin gate + source-table wiring + projection),
 * never the DB. We verify the four things the contract cares about:
 *   1. the gate is load-bearing: when requireSuperAdminApi denies, the route
 *      returns its 403 NextResponse AND no source read is attempted;
 *   2. the happy path returns a correctly-shaped GrowthResponse — channel mix
 *      unioned from AcquisitionEvent `visit` rows + PulseLead UTM, the demand
 *      tiles + demo funnel, the CRM pipeline split (open vs terminal, weighted),
 *      and the PulseLead → customer conversion;
 *   3. logSuperAdminAccess is awaited exactly once with the right surface slug;
 *   4. an invalid ?range= falls back to 30d.
 *
 * withCache is mocked to a passthrough so we test buildGrowthPayload's real
 * wiring against known Prisma return values (the math itself has growth-data.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted — factories reference no outer locals) ───────────

vi.mock("server-only", () => ({}));

const mockRequireSuperAdminApi = vi.fn();
const mockLogSuperAdminAccess = vi.fn();
vi.mock("@/lib/admin-auth.server", () => ({
  requireSuperAdminApi: (...a: unknown[]) => mockRequireSuperAdminApi(...a),
  logSuperAdminAccess: (...a: unknown[]) => mockLogSuperAdminAccess(...a),
}));

// Passthrough cache so the real builder runs and we assert its output.
vi.mock("@/lib/cache.server", () => ({
  withCache: (_key: string, fn: () => unknown) => fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    acquisitionEvent: { findMany: vi.fn() },
    pulseLead: { findMany: vi.fn(), count: vi.fn() },
    demoRequest: { count: vi.fn() },
    booking: { count: vi.fn() },
    contactRequest: { count: vi.fn() },
    newsletterSubscription: { count: vi.fn() },
    organizationInvitation: { count: vi.fn() },
    crmDeal: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ── Import after mocks ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

type Mocked = ReturnType<typeof vi.fn>;

const mockPrisma = prisma as unknown as {
  acquisitionEvent: { findMany: Mocked };
  pulseLead: { findMany: Mocked; count: Mocked };
  demoRequest: { count: Mocked };
  booking: { count: Mocked };
  contactRequest: { count: Mocked };
  newsletterSubscription: { count: Mocked };
  organizationInvitation: { count: Mocked };
  crmDeal: { groupBy: Mocked };
};

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(range?: string): Request {
  const url = new URL("https://app.caelex.com/api/admin/v2/growth");
  if (range) url.searchParams.set("range", range);
  return new Request(url);
}

/** Wire every Prisma read for the authorized happy path. */
function wireHappyPath() {
  // Channel mix: 3 acquisition visits + 1 pulse UTM touch.
  mockPrisma.acquisitionEvent.findMany.mockResolvedValue([
    { source: "google", medium: "organic" },
    { source: "google", medium: "organic" },
    { source: "linkedin", medium: "social" },
  ]);
  mockPrisma.pulseLead.findMany.mockResolvedValue([
    { utmSource: "google", utmMedium: "paid" },
  ]);

  // Demand counts — the route issues these in a fixed Promise.all order:
  //   demoRequest.count, booking.count (booked), booking.count (completed),
  //   contactRequest.count, newsletter.count (active), newsletter.count (new),
  //   organizationInvitation.count.
  mockPrisma.demoRequest.count.mockResolvedValue(20);
  mockPrisma.booking.count
    .mockResolvedValueOnce(8) // booked
    .mockResolvedValueOnce(5); // completed
  mockPrisma.contactRequest.count.mockResolvedValue(14);
  mockPrisma.newsletterSubscription.count
    .mockResolvedValueOnce(312) // active (CONFIRMED)
    .mockResolvedValueOnce(9); // new (windowed)
  mockPrisma.organizationInvitation.count.mockResolvedValue(4);

  // CRM pipeline groupBy: two open stages + won + lost.
  mockPrisma.crmDeal.groupBy.mockResolvedValue([
    { stage: "IDENTIFIED", _count: 2, _sum: { valueCents: BigInt(1_000_000) } },
    { stage: "PROPOSAL", _count: 1, _sum: { valueCents: BigInt(5_000_000) } },
    { stage: "CLOSED_WON", _count: 3, _sum: { valueCents: BigInt(9_000_000) } },
    { stage: "CLOSED_LOST", _count: 1, _sum: { valueCents: null } },
  ]);

  // Lead conversion: 50 leads in the window, 6 converted.
  mockPrisma.pulseLead.count
    .mockResolvedValueOnce(50) // total
    .mockResolvedValueOnce(6); // converted
}

// ── Tests ───────────────────────────────────────────────────────────

describe("GET /api/admin/v2/growth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogSuperAdminAccess.mockResolvedValue(undefined);
  });

  it("returns the gate's 403 and reads NO sources when denied", async () => {
    const denial = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    mockRequireSuperAdminApi.mockResolvedValue(denial);

    const res = await GET(makeRequest("30d"));

    expect(res.status).toBe(403);
    // The gate is load-bearing: nothing downstream ran.
    expect(mockLogSuperAdminAccess).not.toHaveBeenCalled();
    expect(mockPrisma.acquisitionEvent.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.crmDeal.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.demoRequest.count).not.toHaveBeenCalled();
  });

  it("returns 200 with a correctly-shaped, correctly-aggregated payload", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("30d"));
    expect(res.status).toBe(200);
    const body = await res.json();

    // rangeDays echoed (30d → 30).
    expect(body.rangeDays).toBe(30);

    // Channel mix: 4 touches total; google/organic (2) leads. The pulse
    // google/paid touch is a SEPARATE bucket from google/organic.
    expect(body.channelMix.totalTouches).toBe(4);
    expect(body.channelMix.rows[0]).toEqual({
      source: "google",
      medium: "organic",
      touches: 2,
      share: 0.5,
    });
    expect(
      body.channelMix.rows.some(
        (r: { source: string; medium: string }) =>
          r.source === "google" && r.medium === "paid",
      ),
    ).toBe(true);

    // Demand tiles.
    expect(body.demand.demosRequested).toBe(20);
    expect(body.demand.demosBooked).toBe(8);
    expect(body.demand.demosCompleted).toBe(5);
    expect(body.demand.contactRequests).toBe(14);
    expect(body.demand.newsletterActive).toBe(312);
    expect(body.demand.newsletterNew).toBe(9);
    expect(body.demand.invitesSent).toBe(4);

    // Demo funnel: requested→booked→completed with conversion.
    expect(body.demand.demoFunnel.map((s: { key: string }) => s.key)).toEqual([
      "requested",
      "booked",
      "completed",
    ]);
    expect(body.demand.demoFunnel[0].conversionFromPrev).toBeNull(); // first
    expect(body.demand.demoFunnel[1].conversionFromPrev).toBeCloseTo(0.4); // 8/20
    expect(body.demand.demoFunnel[2].conversionFromPrev).toBeCloseTo(0.625); // 5/8

    // CRM pipeline: open = IDENTIFIED(€10k) + PROPOSAL(€50k) = €60k, count 3.
    expect(body.pipeline.openValueEur).toBe(60_000);
    expect(body.pipeline.openCount).toBe(3);
    // Weighted = 10k*0.1 + 50k*0.6 = 31k.
    expect(body.pipeline.weightedValueEur).toBe(31_000);
    // Won/lost surfaced; null valueCents on the lost row → €0 (no crash).
    expect(body.pipeline.wonCount).toBe(3);
    expect(body.pipeline.wonValueEur).toBe(90_000);
    expect(body.pipeline.lostCount).toBe(1);
    // Dense canonical stages present.
    expect(body.pipeline.stages).toHaveLength(9);

    // Lead conversion: 6/50 = 0.12.
    expect(body.leads.total).toBe(50);
    expect(body.leads.converted).toBe(6);
    expect(body.leads.conversionRate).toBeCloseTo(0.12);

    // generatedAt is an ISO timestamp; asOf is a yyyy-mm-dd slice.
    expect(typeof body.generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
    expect(body.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("awaits logSuperAdminAccess exactly once with the growth surface slug", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    await GET(makeRequest("7d"));

    expect(mockLogSuperAdminAccess).toHaveBeenCalledTimes(1);
    expect(mockLogSuperAdminAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        email: "boss@caelex.eu",
        surface: "admin:api/growth",
      }),
    );
  });

  it("falls back to 30d for an invalid range param", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("999z"));
    const body = await res.json();
    expect(body.rangeDays).toBe(30);
  });

  it("honours a valid 90d range", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("90d"));
    const body = await res.json();
    expect(body.rangeDays).toBe(90);
  });

  it("returns a generic 500 (no detail leak) when a source read throws", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();
    mockPrisma.crmDeal.groupBy.mockRejectedValue(new Error("db hiccup"));

    const res = await GET(makeRequest("30d"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to load growth" });
  });
});
