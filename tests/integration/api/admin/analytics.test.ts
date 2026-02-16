import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    // Overview
    organization: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    document: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    analyticsEvent: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    financialEntry: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),

    // Product
    spacecraft: {
      count: vi.fn(),
    },
    authorizationWorkflow: {
      groupBy: vi.fn(),
    },
    debrisAssessment: {
      count: vi.fn(),
    },
    cybersecurityAssessment: {
      count: vi.fn(),
    },
    nIS2Assessment: {
      count: vi.fn(),
    },
    insuranceAssessment: {
      count: vi.fn(),
    },
    environmentalAssessment: {
      count: vi.fn(),
    },

    // Customers
    organizationMember: {
      groupBy: vi.fn(),
    },
    customerHealthScore: {
      findMany: vi.fn(),
    },

    // Acquisition
    acquisitionEvent: {
      groupBy: vi.fn(),
    },

    // Infrastructure
    apiEndpointMetrics: {
      findMany: vi.fn(),
    },
    systemHealthMetric: {
      findMany: vi.fn(),
    },

    // Revenue
    revenueSnapshot: {
      findFirst: vi.fn(),
    },

    // Export
    analyticsDailyAggregate: {
      findMany: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { GET as getOverview } from "@/app/api/admin/analytics/overview/route";
import { GET as getRevenue } from "@/app/api/admin/analytics/revenue/route";
import { GET as getProduct } from "@/app/api/admin/analytics/product/route";
import { GET as getCustomers } from "@/app/api/admin/analytics/customers/route";
import { GET as getAcquisition } from "@/app/api/admin/analytics/acquisition/route";
import { GET as getInfrastructure } from "@/app/api/admin/analytics/infrastructure/route";
import { GET as getExport } from "@/app/api/admin/analytics/export/route";
import {
  GET as getFinancialEntry,
  POST as postFinancialEntry,
} from "@/app/api/admin/analytics/financial-entry/route";

// ---------------------------------------------------------------------------
// Helpers & fixtures
// ---------------------------------------------------------------------------

const adminSession = {
  user: {
    id: "admin-user-id",
    email: "admin@caelex.eu",
    name: "Admin User",
    role: "admin",
  },
};

const memberSession = {
  user: {
    id: "member-user-id",
    email: "member@caelex.eu",
    name: "Regular User",
    role: "member",
  },
};

function makeRequest(
  path: string,
  opts?: { method?: string; body?: unknown },
): Request {
  const init: RequestInit = {
    method: opts?.method || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (opts?.body) {
    init.body = JSON.stringify(opts.body);
  }
  return new Request(`http://localhost${path}`, init);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/admin/analytics/overview
  // =========================================================================
  describe("GET /api/admin/analytics/overview", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/overview");
      const response = await getOverview(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/overview");
      const response = await getOverview(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with overview metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      // Mock all Promise.all calls in order
      vi.mocked(prisma.organization.count)
        .mockResolvedValueOnce(25) // totalOrganizations
        .mockResolvedValueOnce(18) // activeOrganizations
        .mockResolvedValueOnce(5); // previousOrganizations (comparison period)

      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(72) // activeUsers
        .mockResolvedValueOnce(20); // previousUsers (comparison period)

      vi.mocked(prisma.document.count).mockResolvedValueOnce(45);

      vi.mocked(prisma.analyticsEvent.groupBy).mockResolvedValueOnce([
        { eventType: "page_view", _count: { _all: 500 } },
        { eventType: "feature_use", _count: { _all: 120 } },
      ] as any);

      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { date: new Date("2026-02-10"), count: BigInt(15) },
        { date: new Date("2026-02-11"), count: BigInt(22) },
      ]);

      vi.mocked(prisma.subscription.count).mockResolvedValueOnce(12);

      vi.mocked(prisma.financialEntry.aggregate).mockResolvedValueOnce({
        _sum: { amount: 15000 },
      } as any);

      const request = makeRequest("/api/admin/analytics/overview?range=30d");
      const response = await getOverview(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.organizations.total).toBe(25);
      expect(data.metrics.organizations.active).toBe(18);
      expect(data.metrics.users.total).toBe(100);
      expect(data.metrics.users.active).toBe(72);
      expect(data.metrics.revenue.total).toBe(15000);
      expect(data.metrics.engagement.documents).toBe(45);
      expect(data.metrics.engagement.activeSubscriptions).toBe(12);
      expect(data.metrics.engagement.assessments).toBe(120);
      expect(data.trends).toBeDefined();
      expect(data.trends.dau).toHaveLength(2);
      expect(data.period).toBeDefined();
      expect(data.period.range).toBe("30d");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.organization.count).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/overview");
      const response = await getOverview(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch analytics overview");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/revenue
  // =========================================================================
  describe("GET /api/admin/analytics/revenue", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/revenue");
      const response = await getRevenue(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/revenue");
      const response = await getRevenue(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with revenue metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      // Active subscriptions
      vi.mocked(prisma.subscription.findMany)
        .mockResolvedValueOnce([
          {
            id: "sub-1",
            status: "ACTIVE",
            organization: {
              name: "SpaceCorp",
              plan: "PROFESSIONAL",
              createdAt: new Date(),
            },
          },
          {
            id: "sub-2",
            status: "ACTIVE",
            organization: {
              name: "OrbitTech",
              plan: "ENTERPRISE",
              createdAt: new Date(),
            },
          },
        ] as any)
        // Revenue by plan
        .mockResolvedValueOnce([
          { id: "sub-1", organization: { plan: "PROFESSIONAL" } },
          { id: "sub-2", organization: { plan: "ENTERPRISE" } },
        ] as any);

      // Financial entries
      vi.mocked(prisma.financialEntry.findMany).mockResolvedValueOnce([
        {
          id: "fe-1",
          date: new Date("2026-02-01"),
          amount: 500,
          type: "revenue",
        },
        {
          id: "fe-2",
          date: new Date("2026-02-05"),
          amount: 1200,
          type: "revenue",
        },
      ] as any);

      // Monthly revenue raw query
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { month: new Date("2026-01-01"), revenue: 8000, count: BigInt(5) },
        { month: new Date("2026-02-01"), revenue: 9500, count: BigInt(6) },
      ]);

      // Churned subscriptions
      vi.mocked(prisma.subscription.count)
        .mockResolvedValueOnce(2) // churnedSubscriptions
        .mockResolvedValueOnce(3); // newSubscriptions

      // Latest revenue snapshot
      vi.mocked(prisma.revenueSnapshot.findFirst).mockResolvedValueOnce({
        mrr: 9500,
        arr: 114000,
        arpu: 4750,
        ltv: 57000,
        date: new Date(),
      } as any);

      const request = makeRequest("/api/admin/analytics/revenue?range=30d");
      const response = await getRevenue(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.mrr).toBe(9500);
      expect(data.metrics.arr).toBe(114000);
      expect(data.metrics.arpu).toBe(4750);
      expect(data.metrics.activeCustomers).toBe(2);
      expect(data.metrics.newSubscriptions).toBe(3);
      expect(data.metrics.churnedSubscriptions).toBe(2);
      expect(data.trends).toBeDefined();
      expect(data.trends.mrr).toBeDefined();
      expect(data.breakdown).toBeDefined();
      expect(data.period.range).toBe("30d");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.subscription.findMany).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/revenue");
      const response = await getRevenue(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch revenue analytics");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/product
  // =========================================================================
  describe("GET /api/admin/analytics/product", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/product");
      const response = await getProduct(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/product");
      const response = await getProduct(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with product metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      // Module usage (analyticsEvent.groupBy call 1)
      vi.mocked(prisma.analyticsEvent.groupBy)
        .mockResolvedValueOnce([
          { path: "/dashboard/modules/cybersecurity", _count: { _all: 150 } },
          { path: "/dashboard/modules/debris", _count: { _all: 90 } },
        ] as any)
        // Feature events (analyticsEvent.groupBy call 2)
        .mockResolvedValueOnce([
          { eventType: "assessment_started", _count: { _all: 40 } },
          { eventType: "document_uploaded", _count: { _all: 30 } },
        ] as any);

      // Page views raw query
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        {
          date: new Date("2026-02-10"),
          views: BigInt(200),
          unique_users: BigInt(50),
        },
      ]);

      // Document stats
      vi.mocked(prisma.document.groupBy).mockResolvedValueOnce([
        { category: "authorization", _count: { _all: 10 } },
        { category: "insurance", _count: { _all: 5 } },
      ] as any);

      // Spacecraft count
      vi.mocked(prisma.spacecraft.count).mockResolvedValueOnce(8);

      // Workflow stats
      vi.mocked(prisma.authorizationWorkflow.groupBy).mockResolvedValueOnce([
        { status: "IN_PROGRESS", _count: { _all: 3 } },
        { status: "COMPLETED", _count: { _all: 7 } },
      ] as any);

      // Session durations
      vi.mocked(prisma.analyticsEvent.aggregate).mockResolvedValueOnce({
        _avg: { durationMs: 360000 },
        _count: 100,
      } as any);

      // Assessment counts
      vi.mocked(prisma.debrisAssessment.count).mockResolvedValueOnce(4);
      vi.mocked(prisma.cybersecurityAssessment.count).mockResolvedValueOnce(6);
      vi.mocked(prisma.nIS2Assessment.count).mockResolvedValueOnce(3);
      vi.mocked(prisma.insuranceAssessment.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.environmentalAssessment.count).mockResolvedValueOnce(1);

      const request = makeRequest("/api/admin/analytics/product?range=30d");
      const response = await getProduct(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.assessments.total).toBe(16); // 4+6+3+2+1
      expect(data.metrics.assessments.breakdown).toHaveLength(5);
      expect(data.metrics.engagement.spacecraftRegistered).toBe(8);
      expect(data.metrics.engagement.avgSessionMinutes).toBe(6); // 360000ms / 1000 / 60 = 6
      expect(data.metrics.documents.total).toBe(15); // 10+5
      expect(data.metrics.workflows.total).toBe(10); // 3+7
      expect(data.usage).toBeDefined();
      expect(data.usage.modules).toHaveLength(2);
      expect(data.usage.features).toHaveLength(2);
      expect(data.trends.pageViews).toBeDefined();
      expect(data.period.range).toBe("30d");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.analyticsEvent.groupBy).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/product");
      const response = await getProduct(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch product analytics");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/customers
  // =========================================================================
  describe("GET /api/admin/analytics/customers", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/customers");
      const response = await getCustomers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/customers");
      const response = await getCustomers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with customer metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const mockOrgs = [
        {
          id: "org-1",
          name: "SpaceCorp",
          plan: "PROFESSIONAL",
          createdAt: new Date("2025-06-01"),
          subscription: { status: "ACTIVE", plan: "PROFESSIONAL" },
          members: [{ id: "m-1" }],
          _count: { spacecraft: 3, members: 5 },
        },
        {
          id: "org-2",
          name: "OrbitTech",
          plan: "FREE",
          createdAt: new Date("2026-01-15"),
          subscription: null,
          members: [{ id: "m-2" }],
          _count: { spacecraft: 0, members: 2 },
        },
      ];

      // All organizations
      vi.mocked(prisma.organization.findMany)
        .mockResolvedValueOnce(mockOrgs as any)
        // Top organizations
        .mockResolvedValueOnce([
          {
            id: "org-1",
            name: "SpaceCorp",
            plan: "PROFESSIONAL",
            createdAt: new Date("2025-06-01"),
            subscription: { plan: "PROFESSIONAL", status: "ACTIVE" },
            _count: { members: 5, spacecraft: 3 },
          },
        ] as any);

      // New organizations count
      vi.mocked(prisma.organization.count).mockResolvedValueOnce(1);

      // Users by org
      vi.mocked(prisma.organizationMember.groupBy).mockResolvedValueOnce([
        { organizationId: "org-1", _count: { _all: 5 } },
        { organizationId: "org-2", _count: { _all: 2 } },
      ] as any);

      // Health scores
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValueOnce([
        {
          score: 30,
          riskLevel: "high",
          trend: "declining",
          organization: { name: "OrbitTech" },
        },
      ] as any);

      // Signup trend raw query
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { date: new Date("2026-02-10"), signups: BigInt(1) },
      ]);

      // Conversion events
      vi.mocked(prisma.analyticsEvent.groupBy).mockResolvedValueOnce([
        { eventType: "visit", _count: { _all: 500 } },
        { eventType: "signup", _count: { _all: 25 } },
        { eventType: "assessment_complete", _count: { _all: 10 } },
        { eventType: "subscription_created", _count: { _all: 3 } },
      ] as any);

      const request = makeRequest("/api/admin/analytics/customers?range=30d");
      const response = await getCustomers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.total).toBe(2);
      expect(data.metrics.paid).toBe(1);
      expect(data.metrics.newInPeriod).toBe(1);
      expect(data.metrics.avgUsersPerOrg).toBe(3.5); // (5+2)/2
      expect(data.segments).toBeDefined();
      expect(data.segments.byPlan).toHaveLength(4);
      expect(data.funnel).toBeDefined();
      expect(data.funnel).toHaveLength(4);
      expect(data.funnel[0].stage).toBe("Visitors");
      expect(data.funnel[0].count).toBe(500);
      expect(data.atRisk).toHaveLength(1);
      expect(data.atRisk[0].organization).toBe("OrbitTech");
      expect(data.topCustomers).toHaveLength(1);
      expect(data.trends.signups).toBeDefined();
      expect(data.period.range).toBe("30d");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.organization.findMany).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/customers");
      const response = await getCustomers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch customer analytics");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/acquisition
  // =========================================================================
  describe("GET /api/admin/analytics/acquisition", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/acquisition");
      const response = await getAcquisition(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/acquisition");
      const response = await getAcquisition(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with acquisition metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      // acquisitionEvent.groupBy is called 7 times in Promise.all
      vi.mocked(prisma.acquisitionEvent.groupBy)
        // acquisitionEvents by eventType
        .mockResolvedValueOnce([
          { eventType: "visit", _count: { _all: 1000 } },
          { eventType: "signup", _count: { _all: 50 } },
          { eventType: "conversion", _count: { _all: 10 } },
        ] as any)
        // trafficBySource
        .mockResolvedValueOnce([
          { source: "google", _count: { _all: 400 } },
          { source: "linkedin", _count: { _all: 200 } },
          { source: "direct", _count: { _all: 300 } },
        ] as any)
        // trafficByCountry
        .mockResolvedValueOnce([
          { country: "DE", _count: { _all: 350 } },
          { country: "FR", _count: { _all: 200 } },
        ] as any)
        // landingPagePerformance
        .mockResolvedValueOnce([
          { landingPage: "/", _count: { _all: 500 } },
          { landingPage: "/pricing", _count: { _all: 200 } },
        ] as any)
        // campaignPerformance
        .mockResolvedValueOnce([
          {
            campaign: "space-launch-2026",
            source: "google",
            medium: "cpc",
            _count: { _all: 150 },
          },
        ] as any)
        // referrerBreakdown
        .mockResolvedValueOnce([
          {
            referrerUrl: "https://www.spacenews.com/article",
            _count: { _all: 80 },
          },
        ] as any);

      // Daily traffic raw query
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        {
          date: new Date("2026-02-10"),
          visits: BigInt(120),
          signups: BigInt(5),
        },
        {
          date: new Date("2026-02-11"),
          visits: BigInt(140),
          signups: BigInt(8),
        },
      ]);

      const request = makeRequest("/api/admin/analytics/acquisition?range=30d");
      const response = await getAcquisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalVisits).toBe(1000);
      expect(data.metrics.totalSignups).toBe(50);
      expect(data.metrics.totalConversions).toBe(10);
      expect(data.metrics.conversionRate).toBe(5); // (50/1000)*100
      expect(data.sources).toHaveLength(3);
      expect(data.sources[0].source).toBe("Google");
      expect(data.channels).toHaveLength(4);
      expect(data.geography).toHaveLength(2);
      expect(data.geography[0].country).toBe("Germany");
      expect(data.landingPages).toHaveLength(2);
      expect(data.campaigns).toHaveLength(1);
      expect(data.referrers).toHaveLength(1);
      expect(data.referrers[0].referrer).toBe("www.spacenews.com");
      expect(data.trends.traffic).toBeDefined();
      expect(data.period.range).toBe("30d");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.acquisitionEvent.groupBy).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/acquisition");
      const response = await getAcquisition(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch acquisition analytics");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/infrastructure
  // =========================================================================
  describe("GET /api/admin/analytics/infrastructure", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/infrastructure");
      const response = await getInfrastructure(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/infrastructure");
      const response = await getInfrastructure(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with infrastructure metrics for admin", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      // apiEndpointMetrics
      vi.mocked(prisma.apiEndpointMetrics.findMany).mockResolvedValueOnce([
        {
          method: "GET",
          path: "/api/dashboard/overview",
          totalCalls: 500,
          errorCount: 5,
          avgLatency: 120,
          date: new Date("2026-02-15"),
        },
        {
          method: "POST",
          path: "/api/assessment/submit",
          totalCalls: 200,
          errorCount: 10,
          avgLatency: 350,
          date: new Date("2026-02-15"),
        },
      ] as any);

      // Error events
      vi.mocked(prisma.analyticsEvent.groupBy).mockResolvedValueOnce([
        { eventType: "api_error_500", _count: { _all: 15 } },
        { eventType: "api_error_429", _count: { _all: 8 } },
      ] as any);

      // System health metrics
      vi.mocked(prisma.systemHealthMetric.findMany).mockResolvedValueOnce([
        { metricName: "cpu_usage", value: 45, timestamp: new Date() },
        { metricName: "memory_usage", value: 62, timestamp: new Date() },
        { metricName: "disk_usage", value: 38, timestamp: new Date() },
        { metricName: "db_connections", value: 12, timestamp: new Date() },
      ] as any);

      // API call trend raw query
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([
          {
            hour: new Date("2026-02-15T10:00:00Z"),
            calls: BigInt(100),
            errors: BigInt(2),
            avg_duration: 150,
          },
          {
            hour: new Date("2026-02-15T11:00:00Z"),
            calls: BigInt(120),
            errors: BigInt(3),
            avg_duration: 180,
          },
        ])
        // Error trend raw query
        .mockResolvedValueOnce([
          { hour: new Date("2026-02-15T10:00:00Z"), count: BigInt(2) },
          { hour: new Date("2026-02-15T11:00:00Z"), count: BigInt(3) },
        ]);

      // Slow queries
      vi.mocked(prisma.analyticsEvent.findMany).mockResolvedValueOnce([
        {
          path: "/api/reports/generate",
          durationMs: 5200,
          timestamp: new Date("2026-02-15T10:30:00Z"),
          eventData: null,
        },
      ] as any);

      const request = makeRequest(
        "/api/admin/analytics/infrastructure?range=24h",
      );
      const response = await getInfrastructure(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalApiCalls).toBe(220); // 100+120
      expect(data.metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(data.metrics.avgResponseMs).toBeGreaterThan(0);
      expect(data.health).toBeDefined();
      expect(data.health.cpu).toBe(45);
      expect(data.health.memory).toBe(62);
      expect(data.health.disk).toBe(38);
      expect(data.health.dbConnections).toBe(12);
      expect(data.endpoints).toBeDefined();
      expect(data.endpoints).toHaveLength(2);
      expect(data.errors.types).toHaveLength(2);
      expect(data.slowQueries).toHaveLength(1);
      expect(data.slowQueries[0].endpoint).toBe("/api/reports/generate");
      expect(data.slowQueries[0].duration).toBe(5200);
      expect(data.trends.api).toBeDefined();
      expect(data.trends.errors).toBeDefined();
      expect(data.period.range).toBe("24h");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);
      vi.mocked(prisma.apiEndpointMetrics.findMany).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/infrastructure");
      const response = await getInfrastructure(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch infrastructure analytics");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/export
  // =========================================================================
  describe("GET /api/admin/analytics/export", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/export?type=events");
      const response = await getExport(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/export?type=events");
      const response = await getExport(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid export type", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const request = makeRequest("/api/admin/analytics/export?type=invalid");
      const response = await getExport(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid export type");
    });

    it("should return CSV for events export", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.analyticsEvent.findMany).mockResolvedValueOnce([
        {
          timestamp: new Date("2026-02-10T14:30:00Z"),
          eventType: "page_view",
          eventCategory: "engagement",
          userId: "user-1",
          path: "/dashboard",
          durationMs: 5000,
          ipCountry: "DE",
        },
      ] as any);

      const request = makeRequest(
        "/api/admin/analytics/export?type=events&range=7d",
      );
      const response = await getExport(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/csv; charset=utf-8",
      );
      expect(response.headers.get("Content-Disposition")).toContain(
        "caelex-analytics-events",
      );
      expect(response.headers.get("Content-Disposition")).toContain(".csv");

      const csv = await response.text();
      expect(csv).toContain(
        "Timestamp,Event Type,Category,User ID,Path,Duration (ms),Country",
      );
      expect(csv).toContain("page_view");
      expect(csv).toContain("user-1");
      expect(csv).toContain("/dashboard");
    });

    it("should return CSV for customers export", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.organization.findMany).mockResolvedValueOnce([
        {
          name: "SpaceCorp",
          plan: "PROFESSIONAL",
          createdAt: new Date("2025-06-01"),
          subscription: { status: "ACTIVE" },
          _count: { members: 5, spacecraft: 3 },
          healthScore: { score: 85, riskLevel: "low" },
        },
      ] as any);

      const request = makeRequest("/api/admin/analytics/export?type=customers");
      const response = await getExport(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/csv; charset=utf-8",
      );

      const csv = await response.text();
      expect(csv).toContain(
        "Organization,Plan,Members,Spacecraft,Health Score,Risk Level,Created At",
      );
      expect(csv).toContain("SpaceCorp");
      expect(csv).toContain("PROFESSIONAL");
    });

    it("should return CSV for revenue export", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.findMany).mockResolvedValueOnce([
        {
          date: new Date("2026-02-01"),
          type: "revenue",
          category: "subscription",
          amount: 5000,
          currency: "EUR",
          source: "stripe",
          description: "Monthly subscription",
        },
      ] as any);

      const request = makeRequest(
        "/api/admin/analytics/export?type=revenue&range=30d",
      );
      const response = await getExport(request);

      expect(response.status).toBe(200);
      const csv = await response.text();
      expect(csv).toContain(
        "Date,Type,Category,Amount,Currency,Source,Description",
      );
      expect(csv).toContain("subscription");
      expect(csv).toContain("5000");
    });

    it("should return CSV for aggregates export", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.analyticsDailyAggregate.findMany).mockResolvedValueOnce([
        {
          date: new Date("2026-02-10"),
          metricType: "dau",
          metricValue: 42,
          changePercent: 5.2,
        },
      ] as any);

      const request = makeRequest(
        "/api/admin/analytics/export?type=aggregates&range=30d",
      );
      const response = await getExport(request);

      expect(response.status).toBe(200);
      const csv = await response.text();
      expect(csv).toContain("Date,Metric,Value,Change %");
      expect(csv).toContain("dau");
      expect(csv).toContain("42");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.analyticsEvent.findMany).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/export?type=events");
      const response = await getExport(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to export analytics data");
    });
  });

  // =========================================================================
  // GET /api/admin/analytics/financial-entry
  // =========================================================================
  describe("GET /api/admin/analytics/financial-entry", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/financial-entry");
      const response = await getFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/financial-entry");
      const response = await getFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with paginated financial entries", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const mockEntries = [
        {
          id: "entry-1",
          type: "revenue",
          category: "subscription",
          amount: 5000,
          currency: "EUR",
          date: new Date("2026-02-01"),
          source: "stripe",
        },
        {
          id: "entry-2",
          type: "expense",
          category: "infrastructure",
          amount: 800,
          currency: "EUR",
          date: new Date("2026-02-05"),
          source: "manual",
        },
      ];

      vi.mocked(prisma.financialEntry.findMany).mockResolvedValueOnce(
        mockEntries as any,
      );
      vi.mocked(prisma.financialEntry.count).mockResolvedValueOnce(2);

      const request = makeRequest(
        "/api/admin/analytics/financial-entry?page=1&limit=50",
      );
      const response = await getFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.pages).toBe(1);
    });

    it("should filter by type query param", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.findMany).mockResolvedValueOnce(
        [] as any,
      );
      vi.mocked(prisma.financialEntry.count).mockResolvedValueOnce(0);

      const request = makeRequest(
        "/api/admin/analytics/financial-entry?type=revenue",
      );
      await getFinancialEntry(request);

      expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: "revenue" },
        }),
      );
      expect(prisma.financialEntry.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: "revenue" },
        }),
      );
    });

    it("should cap limit at 100", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.findMany).mockResolvedValueOnce(
        [] as any,
      );
      vi.mocked(prisma.financialEntry.count).mockResolvedValueOnce(0);

      const request = makeRequest(
        "/api/admin/analytics/financial-entry?limit=500",
      );
      const response = await getFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(100);

      expect(prisma.financialEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.findMany).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/financial-entry");
      const response = await getFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch entries");
    });
  });

  // =========================================================================
  // POST /api/admin/analytics/financial-entry
  // =========================================================================
  describe("POST /api/admin/analytics/financial-entry", () => {
    const validPayload = {
      type: "revenue",
      category: "subscription",
      amount: 5000,
      currency: "EUR",
      date: "2026-02-01",
      description: "Monthly subscription payment",
      isRecurring: true,
      recurringPeriod: "monthly",
    };

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: validPayload,
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is not admin", async () => {
      vi.mocked(auth).mockResolvedValue(memberSession as any);

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: validPayload,
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid payload", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: {
          type: "invalid_type",
          category: "",
          amount: -100,
        },
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
    });

    it("should return 400 when required fields are missing", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: {
          type: "revenue",
          // missing category, amount, date
        },
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should create financial entry with valid data", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      const createdEntry = {
        id: "entry-new",
        ...validPayload,
        date: new Date("2026-02-01"),
        source: "manual",
        createdBy: "admin-user-id",
      };

      vi.mocked(prisma.financialEntry.create).mockResolvedValueOnce(
        createdEntry as any,
      );

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: validPayload,
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entry).toBeDefined();
      expect(data.entry.id).toBe("entry-new");

      expect(prisma.financialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "revenue",
          category: "subscription",
          amount: 5000,
          currency: "EUR",
          description: "Monthly subscription payment",
          isRecurring: true,
          recurringPeriod: "monthly",
          source: "manual",
          createdBy: "admin-user-id",
        }),
      });
    });

    it("should default currency to EUR when not provided", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.create).mockResolvedValueOnce({
        id: "entry-new",
        type: "expense",
        category: "hosting",
        amount: 200,
        currency: "EUR",
        date: new Date("2026-02-01"),
        source: "manual",
        createdBy: "admin-user-id",
      } as any);

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: {
          type: "expense",
          category: "hosting",
          amount: 200,
          date: "2026-02-01",
          // no currency field
        },
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.financialEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: "EUR",
        }),
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(adminSession as any);

      vi.mocked(prisma.financialEntry.create).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = makeRequest("/api/admin/analytics/financial-entry", {
        method: "POST",
        body: validPayload,
      });
      const response = await postFinancialEntry(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create entry");
    });
  });
});
