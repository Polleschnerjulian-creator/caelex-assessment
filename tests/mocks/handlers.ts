import { http, HttpResponse } from "msw";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Mock user session
const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "USER",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock data
const mockDocuments = [
  {
    id: "doc-1",
    name: "Test Document 1",
    category: "LICENSE",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    isExpired: false,
    isLatest: true,
  },
  {
    id: "doc-2",
    name: "Test Document 2",
    category: "CERTIFICATE",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    expiryDate: null,
    isExpired: false,
    isLatest: true,
  },
];

const mockDeadlines = [
  {
    id: "deadline-1",
    title: "Authorization Submission",
    description: "Submit authorization application",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: "AUTHORIZATION",
    priority: "HIGH",
    status: "PENDING",
    moduleType: "AUTHORIZATION",
  },
  {
    id: "deadline-2",
    title: "Annual Report",
    description: "Submit annual compliance report",
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    category: "REPORTING",
    priority: "MEDIUM",
    status: "PENDING",
    moduleType: "SUPERVISION",
  },
];

const mockTrackerState = {
  id: "tracker-1",
  userId: "test-user-id",
  currentStep: 3,
  totalSteps: 8,
  completedSteps: [1, 2],
  assessmentData: {
    activityType: "spacecraft",
    isEUEstablished: true,
  },
};

export const handlers = [
  // Auth handlers
  http.get(`${baseUrl}/api/auth/session`, () => {
    return HttpResponse.json(mockSession);
  }),

  http.post(`${baseUrl}/api/auth/signin/*`, () => {
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${baseUrl}/api/auth/signout`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // Documents handlers
  http.get(`${baseUrl}/api/documents`, () => {
    return HttpResponse.json({
      documents: mockDocuments,
      total: mockDocuments.length,
    });
  }),

  http.get(`${baseUrl}/api/documents/dashboard`, () => {
    return HttpResponse.json({
      stats: {
        total: 10,
        expired: 2,
        expiringThisMonth: 3,
        expiringNext90Days: 5,
        draft: 2,
        active: 6,
        completeness: 80,
      },
      byCategory: [
        { category: "LICENSE", count: 3 },
        { category: "CERTIFICATE", count: 4 },
        { category: "INSURANCE_POLICY", count: 3 },
      ],
      expiringDocuments: mockDocuments,
      expiredDocuments: [],
      recentDocuments: mockDocuments,
    });
  }),

  http.get(`${baseUrl}/api/documents/compliance-check`, () => {
    return HttpResponse.json({
      overallCompleteness: 75,
      moduleCompliance: [
        {
          module: "AUTHORIZATION",
          required: 5,
          present: 4,
          completeness: 80,
          missing: [],
          documents: [],
        },
        {
          module: "CYBERSECURITY",
          required: 3,
          present: 2,
          completeness: 67,
          missing: [],
          documents: [],
        },
      ],
      criticalMissing: [],
      totalRequired: 8,
      totalPresent: 6,
    });
  }),

  http.get(`${baseUrl}/api/documents/:id`, ({ params }) => {
    const doc = mockDocuments.find((d) => d.id === params.id);
    if (!doc) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ document: doc });
  }),

  http.post(`${baseUrl}/api/documents`, async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const newDoc = {
      id: `doc-${Date.now()}`,
      name,
      category,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      expiryDate: null,
      isExpired: false,
      isLatest: true,
    };
    return HttpResponse.json({ success: true, document: newDoc });
  }),

  http.patch(`${baseUrl}/api/documents/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      document: { id: params.id, ...body },
    });
  }),

  http.delete(`${baseUrl}/api/documents/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Timeline handlers
  http.get(`${baseUrl}/api/timeline`, () => {
    return HttpResponse.json({
      stats: {
        total: 15,
        overdue: 2,
        dueThisWeek: 4,
        dueThisMonth: 8,
        completed: 5,
        pending: 8,
      },
      upcomingDeadlines: mockDeadlines,
      overdueDeadlines: [],
      recentlyCompleted: [],
    });
  }),

  http.get(`${baseUrl}/api/timeline/deadlines`, () => {
    return HttpResponse.json({
      deadlines: mockDeadlines,
      total: mockDeadlines.length,
    });
  }),

  http.post(`${baseUrl}/api/timeline/deadlines`, async ({ request }) => {
    const body = await request.json();
    const newDeadline = {
      id: `deadline-${Date.now()}`,
      ...body,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, deadline: newDeadline });
  }),

  http.patch(
    `${baseUrl}/api/timeline/deadlines/:id`,
    async ({ params, request }) => {
      const body = await request.json();
      return HttpResponse.json({
        success: true,
        deadline: { id: params.id, ...body },
      });
    },
  ),

  http.post(`${baseUrl}/api/timeline/deadlines/:id/complete`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      deadline: { id: params.id, status: "COMPLETED" },
    });
  }),

  http.get(`${baseUrl}/api/timeline/calendar`, () => {
    return HttpResponse.json({
      events: mockDeadlines.map((d) => ({
        id: d.id,
        title: d.title,
        date: d.dueDate,
        type: "deadline",
        status: d.status,
        priority: d.priority,
      })),
    });
  }),

  // Tracker handlers
  http.get(`${baseUrl}/api/tracker`, () => {
    return HttpResponse.json(mockTrackerState);
  }),

  http.post(`${baseUrl}/api/tracker`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      tracker: { ...mockTrackerState, ...body },
    });
  }),

  http.patch(`${baseUrl}/api/tracker`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      tracker: { ...mockTrackerState, ...body },
    });
  }),

  // Environmental handlers
  http.get(`${baseUrl}/api/environmental`, () => {
    return HttpResponse.json({
      assessment: {
        missionPhase: "design",
        footprintScore: 72,
        complianceStatus: "partial",
      },
    });
  }),

  http.post(`${baseUrl}/api/environmental/calculate`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      result: {
        totalFootprint: 1250.5,
        categories: {
          manufacturing: 450.2,
          launch: 350.8,
          operations: 299.5,
          disposal: 150.0,
        },
        complianceScore: 78,
        recommendations: [
          "Consider reusable launch vehicle",
          "Optimize solar panel efficiency",
        ],
      },
    });
  }),

  // Cybersecurity handlers
  http.get(`${baseUrl}/api/cybersecurity`, () => {
    return HttpResponse.json({
      assessment: {
        riskLevel: "medium",
        complianceScore: 82,
        lastAssessment: new Date().toISOString(),
      },
    });
  }),

  http.post(`${baseUrl}/api/cybersecurity/assess`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      result: {
        overallRiskLevel: "medium",
        complianceScore: 78,
        vulnerabilities: [
          {
            id: "vuln-1",
            severity: "high",
            description: "Outdated encryption",
          },
          {
            id: "vuln-2",
            severity: "medium",
            description: "Missing access controls",
          },
        ],
        recommendations: ["Update encryption protocols", "Implement MFA"],
      },
    });
  }),

  // Supervision handlers
  http.get(`${baseUrl}/api/supervision`, () => {
    return HttpResponse.json({
      status: {
        overallCompliance: 85,
        pendingActions: 3,
        recentReports: [],
      },
    });
  }),

  http.get(`${baseUrl}/api/supervision/reports`, () => {
    return HttpResponse.json({
      reports: [
        {
          id: "report-1",
          type: "quarterly",
          status: "submitted",
          submittedAt: new Date().toISOString(),
        },
        {
          id: "report-2",
          type: "incident",
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });
  }),

  // Insurance handlers
  http.get(`${baseUrl}/api/insurance`, () => {
    return HttpResponse.json({
      coverage: {
        totalRequired: 10000000,
        currentCoverage: 8000000,
        gap: 2000000,
        policies: [],
      },
    });
  }),

  http.post(`${baseUrl}/api/insurance/calculate`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      result: {
        minimumCoverage: 5000000,
        recommendedCoverage: 10000000,
        estimatedPremium: {
          annual: 125000,
          monthly: 11500,
        },
        riskFactors: ["LEO debris environment", "Active maneuvering"],
      },
    });
  }),
];

// Export mock data for use in tests
export const mockData = {
  session: mockSession,
  documents: mockDocuments,
  deadlines: mockDeadlines,
  tracker: mockTrackerState,
};
