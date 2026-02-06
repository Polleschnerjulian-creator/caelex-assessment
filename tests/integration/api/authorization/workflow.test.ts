import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    authorizationDocument: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => {
      const { prisma } = await import("@/lib/prisma");
      return fn(prisma);
    }),
  },
}));

// Mock audit functions
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn(() => ({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  })),
  generateAuditDescription: vi.fn(
    (action: string, entityType: string) => `${action} on ${entityType}`,
  ),
}));

// Mock NCA determination
vi.mock("@/data/ncas", () => ({
  determineNCA: vi.fn(() => ({
    primaryNCA: { id: "de", name: "German Space Agency at DLR" },
    secondaryNCAs: null,
    pathway: "national_authorization",
    relevantArticles: [6, 7, 8, 9],
    requirements: ["Submit authorization application to NCA"],
    estimatedTimeline: "12-18 months",
    notes: "Standard national authorization pathway",
  })),
}));

// Mock authorization documents
vi.mock("@/data/authorization-documents", () => ({
  getRequiredDocuments: vi.fn(() => [
    {
      id: "mission_description",
      type: "mission_description",
      name: "Mission Description",
      description: "Comprehensive description of the space mission",
      articleRef: "Art. 7(2)(a)",
      required: true,
    },
    {
      id: "technical_specs",
      type: "technical_specs",
      name: "Technical Specifications",
      description: "Detailed technical specifications",
      articleRef: "Art. 7(2)(b)",
      required: true,
    },
  ]),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { determineNCA } from "@/data/ncas";
import { getRequiredDocuments } from "@/data/authorization-documents";
import { GET, POST } from "@/app/api/authorization/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockWorkflow = {
  id: "workflow-1",
  userId: "test-user-id",
  primaryNCA: "de",
  primaryNCAName: "German Space Agency at DLR",
  secondaryNCAs: null,
  pathway: "national_authorization",
  operatorType: "spacecraft_operator",
  launchCountry: null,
  status: "not_started",
  targetSubmission: null,
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-15"),
  documents: [
    {
      id: "doc-1",
      workflowId: "workflow-1",
      documentType: "mission_description",
      name: "Mission Description",
      description: "Comprehensive description of the space mission",
      articleRef: "Art. 7(2)(a)",
      required: true,
      status: "not_started",
      createdAt: new Date("2025-01-15"),
      updatedAt: new Date("2025-01-15"),
    },
  ],
};

const mockUserProfile = {
  operatorType: "spacecraft_operator",
  establishmentCountry: "DE",
  isThirdCountry: false,
  organization: "Test Space GmbH",
};

describe("Authorization Workflow API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return workflows for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        mockWorkflow as any,
      ]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        mockUserProfile as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toBeDefined();
      expect(data.workflows).toHaveLength(1);
      expect(data.workflows[0].id).toBe("workflow-1");
      expect(data.workflows[0].operatorType).toBe("spacecraft_operator");
      expect(data.workflows[0].documents).toHaveLength(1);
    });

    it("should return empty array when no workflows exist", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        mockUserProfile as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toEqual([]);
    });

    it("should include user profile in response", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        mockUserProfile as any,
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.operatorType).toBe("spacecraft_operator");
      expect(data.user.establishmentCountry).toBe("DE");
      expect(data.user.isThirdCountry).toBe(false);
      expect(data.user.organization).toBe("Test Space GmbH");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        select: {
          operatorType: true,
          establishmentCountry: true,
          isThirdCountry: true,
          organization: true,
        },
      });
    });
  });

  describe("POST /api/authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          establishmentCountry: "DE",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when operatorType is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishmentCountry: "DE",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("operatorType is required");
    });

    it("should return 400 when establishmentCountry is missing for EU operator", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          // isThirdCountry defaults to false, so establishmentCountry is required
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "establishmentCountry is required for EU operators",
      );
    });

    it("should create workflow successfully with valid data", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const createdWorkflow = {
        id: "workflow-new",
        userId: "test-user-id",
        primaryNCA: "de",
        primaryNCAName: "German Space Agency at DLR",
        secondaryNCAs: null,
        pathway: "national_authorization",
        operatorType: "spacecraft_operator",
        launchCountry: null,
        status: "not_started",
        targetSubmission: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdDoc1 = {
        id: "auth-doc-1",
        workflowId: "workflow-new",
        documentType: "mission_description",
        name: "Mission Description",
        description: "Comprehensive description of the space mission",
        articleRef: "Art. 7(2)(a)",
        required: true,
        status: "not_started",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdDoc2 = {
        id: "auth-doc-2",
        workflowId: "workflow-new",
        documentType: "technical_specs",
        name: "Technical Specifications",
        description: "Detailed technical specifications",
        articleRef: "Art. 7(2)(b)",
        required: true,
        status: "not_started",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.authorizationWorkflow.create).mockResolvedValue(
        createdWorkflow as any,
      );
      vi.mocked(prisma.authorizationDocument.create)
        .mockResolvedValueOnce(createdDoc1 as any)
        .mockResolvedValueOnce(createdDoc2 as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          establishmentCountry: "DE",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflow).toBeDefined();
      expect(data.workflow.id).toBe("workflow-new");
      expect(data.workflow.operatorType).toBe("spacecraft_operator");
      expect(data.workflow.documents).toHaveLength(2);
      expect(data.ncaDetermination).toBeDefined();
      expect(data.ncaDetermination.primaryNCA.id).toBe("de");
      expect(data.ncaDetermination.pathway).toBe("national_authorization");
    });

    it("should allow missing establishmentCountry when isThirdCountry is true", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const createdWorkflow = {
        id: "workflow-tco",
        userId: "test-user-id",
        primaryNCA: "euspa",
        primaryNCAName: "EUSPA",
        secondaryNCAs: null,
        pathway: "euspa_registration",
        operatorType: "spacecraft_operator",
        launchCountry: null,
        status: "not_started",
        targetSubmission: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.authorizationWorkflow.create).mockResolvedValue(
        createdWorkflow as any,
      );
      vi.mocked(prisma.authorizationDocument.create).mockResolvedValue({
        id: "auth-doc-tco",
        workflowId: "workflow-tco",
        documentType: "mission_description",
        name: "Mission Description",
        status: "not_started",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          isThirdCountry: true,
          // no establishmentCountry - should be allowed
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflow).toBeDefined();
      expect(data.workflow.id).toBe("workflow-tco");
    });

    it("should call logAuditEvent on successful creation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const createdWorkflow = {
        id: "workflow-audit",
        userId: "test-user-id",
        primaryNCA: "de",
        primaryNCAName: "German Space Agency at DLR",
        secondaryNCAs: null,
        pathway: "national_authorization",
        operatorType: "spacecraft_operator",
        launchCountry: null,
        status: "not_started",
        targetSubmission: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.authorizationWorkflow.create).mockResolvedValue(
        createdWorkflow as any,
      );
      vi.mocked(prisma.authorizationDocument.create).mockResolvedValue({
        id: "auth-doc-audit",
        workflowId: "workflow-audit",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          establishmentCountry: "DE",
        }),
      });

      await POST(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "test-user-id",
          action: "workflow_created",
          entityType: "workflow",
          entityId: "workflow-audit",
          newValue: expect.objectContaining({
            operatorType: "spacecraft_operator",
            pathway: "national_authorization",
            primaryNCA: "German Space Agency at DLR",
            documentsCount: 2,
          }),
        }),
      );
    });

    it("should update user profile with operator info", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const createdWorkflow = {
        id: "workflow-profile",
        userId: "test-user-id",
        primaryNCA: "de",
        primaryNCAName: "German Space Agency at DLR",
        secondaryNCAs: null,
        pathway: "national_authorization",
        operatorType: "launch_operator",
        launchCountry: "FR",
        status: "not_started",
        targetSubmission: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.authorizationWorkflow.create).mockResolvedValue(
        createdWorkflow as any,
      );
      vi.mocked(prisma.authorizationDocument.create).mockResolvedValue({
        id: "auth-doc-profile",
        workflowId: "workflow-profile",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "launch_operator",
          establishmentCountry: "DE",
          launchCountry: "FR",
          isThirdCountry: false,
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        data: {
          operatorType: "launch_operator",
          establishmentCountry: "DE",
          isThirdCountry: false,
        },
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new Request("http://localhost/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: "spacecraft_operator",
          establishmentCountry: "DE",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
