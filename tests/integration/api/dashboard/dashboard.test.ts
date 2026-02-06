import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @/lib/auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock @/lib/services
vi.mock("@/lib/services", () => ({
  getComplianceOverview: vi.fn(),
  calculateComplianceScore: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getTrendData: vi.fn(),
  getDashboardAlerts: vi.fn(),
}));

import { auth } from "@/lib/auth";
import {
  getComplianceOverview,
  calculateComplianceScore,
  getDashboardMetrics,
  getTrendData,
  getDashboardAlerts,
} from "@/lib/services";
import { GET as getOverview } from "@/app/api/dashboard/overview/route";
import { GET as getMetrics } from "@/app/api/dashboard/metrics/route";
import { GET as getTrends } from "@/app/api/dashboard/trends/route";
import { GET as getAlerts } from "@/app/api/dashboard/alerts/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockOverview = {
  overallScore: 72,
  overallStatus: "partial" as const,
  modules: [
    {
      id: "authorization",
      name: "Authorization & Registration",
      status: "compliant" as const,
      score: 95,
      lastUpdated: new Date("2025-12-01"),
      itemsComplete: 18,
      itemsTotal: 20,
      criticalIssues: 0,
      nextDeadline: new Date("2026-06-01"),
    },
    {
      id: "debris",
      name: "Debris Mitigation",
      status: "partial" as const,
      score: 60,
      lastUpdated: new Date("2025-11-15"),
      itemsComplete: 9,
      itemsTotal: 15,
      criticalIssues: 1,
      nextDeadline: new Date("2026-03-01"),
    },
  ],
  criticalAlerts: 2,
  pendingDeadlines: 5,
  openIncidents: 1,
  lastAssessmentDate: new Date("2025-12-01"),
};

const mockDetailedScore = {
  overall: 72,
  grade: "C" as const,
  status: "partial" as const,
  breakdown: {
    authorization: {
      score: 95,
      weight: 0.25,
      weightedScore: 23.75,
      status: "compliant" as const,
      factors: [],
      articleReferences: ["Art. 6", "Art. 7"],
    },
    debris: {
      score: 60,
      weight: 0.2,
      weightedScore: 12,
      status: "partial" as const,
      factors: [],
      articleReferences: ["Art. 55", "Art. 56"],
    },
    cybersecurity: {
      score: 70,
      weight: 0.2,
      weightedScore: 14,
      status: "partial" as const,
      factors: [],
      articleReferences: ["Art. 74"],
    },
    insurance: {
      score: 80,
      weight: 0.15,
      weightedScore: 12,
      status: "partial" as const,
      factors: [],
      articleReferences: ["Art. 28"],
    },
    environmental: {
      score: 50,
      weight: 0.1,
      weightedScore: 5,
      status: "non_compliant" as const,
      factors: [],
      articleReferences: ["Art. 96"],
    },
    reporting: {
      score: 55,
      weight: 0.1,
      weightedScore: 5.5,
      status: "partial" as const,
      factors: [],
      articleReferences: ["Art. 33"],
    },
  },
  recommendations: [
    {
      priority: "critical" as const,
      module: "debris",
      action: "Complete deorbit plan documentation",
      impact: "Required for authorization renewal",
      articleRef: "Art. 58",
      estimatedEffort: "high" as const,
    },
    {
      priority: "high" as const,
      module: "environmental",
      action: "Submit Environmental Footprint Declaration",
      impact: "Mandatory by 2030 deadline",
      articleRef: "Art. 96",
      estimatedEffort: "medium" as const,
    },
    {
      priority: "high" as const,
      module: "cybersecurity",
      action: "Conduct NIS2-aligned risk assessment",
      impact: "Regulatory compliance gap",
      articleRef: "Art. 74",
      estimatedEffort: "high" as const,
    },
    {
      priority: "medium" as const,
      module: "reporting",
      action: "Set up quarterly compliance reporting",
      impact: "Ongoing obligation",
      articleRef: "Art. 34",
      estimatedEffort: "low" as const,
    },
    {
      priority: "medium" as const,
      module: "insurance",
      action: "Review third-party liability coverage limits",
      impact: "Potential underinsurance risk",
      articleRef: "Art. 28",
      estimatedEffort: "medium" as const,
    },
    {
      priority: "low" as const,
      module: "authorization",
      action: "Archive superseded authorization documents",
      impact: "Audit readiness improvement",
      estimatedEffort: "low" as const,
    },
  ],
  lastCalculated: new Date("2025-12-15"),
};

const mockMetrics = {
  authorization: {
    workflowsActive: 3,
    workflowsCompleted: 12,
    documentsReady: 18,
    documentsTotal: 22,
    pendingSubmissions: 2,
  },
  incidents: {
    total: 8,
    open: 2,
    resolved: 6,
    bySeverity: { critical: 1, high: 2, medium: 3, low: 2 },
    pendingNCANotifications: 1,
    overdueNotifications: 0,
  },
  debris: {
    assessmentsComplete: 4,
    complianceScore: 75,
    passivationPlans: 3,
    deorbitPlans: 2,
  },
  cybersecurity: {
    assessmentsComplete: 2,
    maturityScore: 68,
    hasIncidentResponsePlan: true,
    incidentsThisYear: 3,
  },
  insurance: {
    assessmentComplete: 1,
    calculatedTPL: 5000000,
    complianceScore: 80,
    riskLevel: "medium",
  },
  environmental: {
    efdSubmitted: false,
    suppliersContacted: 15,
    suppliersResponded: 8,
    totalGWP: 1250.5,
  },
  reports: {
    generatedThisMonth: 4,
    submittedToNCA: 2,
    pendingAcknowledgment: 1,
  },
};

const mockTrendData = [
  { date: "2025-11-01", score: 60, incidents: 2, completedTasks: 5 },
  { date: "2025-11-15", score: 65, incidents: 1, completedTasks: 8 },
  { date: "2025-12-01", score: 70, incidents: 0, completedTasks: 12 },
  { date: "2025-12-15", score: 72, incidents: 1, completedTasks: 15 },
];

const mockAlerts = [
  {
    id: "alert-1",
    type: "deadline" as const,
    severity: "critical" as const,
    title: "Authorization renewal due",
    description: "Spacecraft operator authorization expires in 30 days",
    dueDate: new Date("2026-01-15"),
    link: "/dashboard/modules/authorization",
    resourceType: "authorization",
    resourceId: "auth-1",
  },
  {
    id: "alert-2",
    type: "incident" as const,
    severity: "high" as const,
    title: "Unresolved cybersecurity incident",
    description: "NCA notification deadline approaching for incident INC-042",
    dueDate: new Date("2026-01-05"),
    link: "/dashboard/modules/supervision",
    resourceType: "incident",
    resourceId: "inc-42",
  },
  {
    id: "alert-3",
    type: "expiry" as const,
    severity: "medium" as const,
    title: "Insurance certificate expiring",
    description: "Third-party liability insurance expires in 60 days",
    dueDate: new Date("2026-02-15"),
    link: "/dashboard/modules/insurance",
    resourceType: "insurance",
    resourceId: "ins-1",
  },
  {
    id: "alert-4",
    type: "compliance" as const,
    severity: "medium" as const,
    title: "EFD submission pending",
    description: "Environmental Footprint Declaration has not been submitted",
    dueDate: new Date("2026-06-01"),
    link: "/dashboard/modules/environmental",
    resourceType: "environmental",
    resourceId: "efd-1",
  },
  {
    id: "alert-5",
    type: "action_required" as const,
    severity: "low" as const,
    title: "Quarterly report due",
    description: "Q1 2026 compliance report should be prepared",
    dueDate: new Date("2026-03-31"),
    link: "/dashboard/modules/supervision",
    resourceType: "report",
    resourceId: "rpt-q1-2026",
  },
];

describe("Dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/dashboard/overview
  // ==========================================================================
  describe("GET /api/dashboard/overview", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await getOverview();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return overview with score for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getComplianceOverview).mockResolvedValue(mockOverview as any);
      vi.mocked(calculateComplianceScore).mockResolvedValue(
        mockDetailedScore as any,
      );

      const response = await getOverview();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify overview includes merged score data
      expect(data.overview).toBeDefined();
      expect(data.overview.overallScore).toBe(72);
      expect(data.overview.grade).toBe("C");
      expect(data.overview.detailedStatus).toBe("partial");
      expect(data.overview.modules).toHaveLength(2);

      // Verify score breakdown
      expect(data.score).toBeDefined();
      expect(data.score.overall).toBe(72);
      expect(data.score.grade).toBe("C");
      expect(data.score.status).toBe("partial");
      expect(data.score.breakdown).toBeDefined();
      expect(data.score.breakdown.authorization.score).toBe(95);

      // Verify services were called with user ID
      expect(getComplianceOverview).toHaveBeenCalledWith("test-user-id");
      expect(calculateComplianceScore).toHaveBeenCalledWith("test-user-id");
    });

    it("should return top 5 recommendations maximum", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getComplianceOverview).mockResolvedValue(mockOverview as any);
      vi.mocked(calculateComplianceScore).mockResolvedValue(
        mockDetailedScore as any,
      );

      const response = await getOverview();
      const data = await response.json();

      expect(response.status).toBe(200);
      // mockDetailedScore has 6 recommendations, but only top 5 should be returned
      expect(data.topRecommendations).toHaveLength(5);
      expect(data.topRecommendations[0].priority).toBe("critical");
      expect(data.topRecommendations[4].priority).toBe("medium");
    });

    it("should return 500 on service error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getComplianceOverview).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await getOverview();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get dashboard overview");
    });
  });

  // ==========================================================================
  // GET /api/dashboard/metrics
  // ==========================================================================
  describe("GET /api/dashboard/metrics", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return metrics data for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getDashboardMetrics).mockResolvedValue(mockMetrics as any);

      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.generatedAt).toBeDefined();

      // Verify metrics structure
      expect(data.metrics.authorization.workflowsActive).toBe(3);
      expect(data.metrics.incidents.open).toBe(2);
      expect(data.metrics.debris.complianceScore).toBe(75);
      expect(data.metrics.cybersecurity.hasIncidentResponsePlan).toBe(true);
      expect(data.metrics.insurance.riskLevel).toBe("medium");
      expect(data.metrics.environmental.efdSubmitted).toBe(false);
      expect(data.metrics.reports.generatedThisMonth).toBe(4);

      // Verify service called with user ID
      expect(getDashboardMetrics).toHaveBeenCalledWith("test-user-id");
    });

    it("should return 500 on service error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getDashboardMetrics).mockRejectedValue(
        new Error("Service unavailable"),
      );

      const response = await getMetrics();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get dashboard metrics");
    });
  });

  // ==========================================================================
  // GET /api/dashboard/alerts
  // ==========================================================================
  describe("GET /api/dashboard/alerts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/dashboard/alerts");
      const response = await getAlerts(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return alerts for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getDashboardAlerts).mockResolvedValue(mockAlerts as any);

      const request = new Request("http://localhost/api/dashboard/alerts");
      const response = await getAlerts(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alerts).toHaveLength(5);

      // Verify summary counts
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBe(5);
      expect(data.summary.critical).toBe(1);
      expect(data.summary.high).toBe(1);
      expect(data.summary.medium).toBe(2);
      expect(data.summary.low).toBe(1);

      // Verify byType counts
      expect(data.byType).toBeDefined();
      expect(data.byType.deadlines).toBe(1);
      expect(data.byType.incidents).toBe(1);
      expect(data.byType.expiries).toBe(1);
      expect(data.byType.compliance).toBe(1);
      expect(data.byType.actionRequired).toBe(1);

      // Verify grouped by severity
      expect(data.groupedBySeverity).toBeDefined();
      expect(data.groupedBySeverity.critical).toHaveLength(1);
      expect(data.groupedBySeverity.high).toHaveLength(1);

      // Verify service called with user ID and default limit
      expect(getDashboardAlerts).toHaveBeenCalledWith("test-user-id", 10);
    });
  });

  // ==========================================================================
  // GET /api/dashboard/trends
  // ==========================================================================
  describe("GET /api/dashboard/trends", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/dashboard/trends");
      const response = await getTrends(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return trend data for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getTrendData).mockResolvedValue(mockTrendData as any);

      const request = new Request("http://localhost/api/dashboard/trends");
      const response = await getTrends(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.period).toBe("30d");
      expect(data.dataPoints).toHaveLength(4);

      // Verify summary calculations
      expect(data.summary).toBeDefined();
      expect(data.summary.averageScore).toBe(67); // (60+65+70+72)/4 = 66.75, rounded to 67
      expect(data.summary.minScore).toBe(60);
      expect(data.summary.maxScore).toBe(72);
      expect(data.summary.trend).toBe(12); // 72 - 60
      expect(data.summary.trendDirection).toBe("up");
      expect(data.summary.totalIncidents).toBe(4); // 2+1+0+1
      expect(data.summary.totalCompletedTasks).toBe(40); // 5+8+12+15

      // Verify service called with default 30 days
      expect(getTrendData).toHaveBeenCalledWith("test-user-id", 30);
    });
  });
});
