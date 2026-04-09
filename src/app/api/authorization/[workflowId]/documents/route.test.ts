/**
 * Authorization Document Status Route Tests (PUT, POST)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: { findFirst: vi.fn() },
    authorizationDocument: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test" }),
  generateAuditDescription: vi.fn().mockReturnValue("desc"),
}));

const mockEvaluateWorkflowTransitions = vi.fn();
vi.mock("@/lib/services", () => ({
  evaluateWorkflowTransitions: (...a: unknown[]) =>
    mockEvaluateWorkflowTransitions(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(async () => ({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60_000,
  })),
  getIdentifier: vi.fn(() => "test-identifier"),
}));

import { PUT, POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  authorizationWorkflow: { findFirst: ReturnType<typeof vi.fn> };
  authorizationDocument: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const params = Promise.resolve({ workflowId: "wf-1" });

describe("Authorization [workflowId]/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.authorizationWorkflow.findFirst.mockReset();
    mockPrisma.authorizationDocument.findFirst.mockReset();
    mockPrisma.authorizationDocument.update.mockReset();
    mockPrisma.authorizationDocument.create.mockReset();
    mockEvaluateWorkflowTransitions.mockReset();
    mockEvaluateWorkflowTransitions.mockResolvedValue({
      transitioned: false,
      finalState: "in_progress",
      transitions: [],
      context: {
        totalDocuments: 5,
        readyDocuments: 1,
        mandatoryDocuments: 3,
        mandatoryReady: 1,
        completenessPercentage: 20,
        allMandatoryComplete: false,
      },
    });
  });

  describe("PUT (update document status)", () => {
    function makePut(body: unknown): Request {
      return new Request(
        "https://app.caelex.com/api/authorization/wf-1/documents",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await PUT(makePut({}), { params })).status).toBe(401);
    });

    it("returns 400 on invalid input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await PUT(makePut({}), { params })).status).toBe(400);
    });

    it("returns 404 when workflow not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const res = await PUT(makePut({ documentId: "doc-1" }), { params });
      expect(res.status).toBe(404);
    });

    it("returns 404 when document not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationDocument.findFirst.mockResolvedValue(null);
      const res = await PUT(makePut({ documentId: "doc-1" }), { params });
      expect(res.status).toBe(404);
    });

    it("rejects invalid document status transitions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationDocument.findFirst.mockResolvedValue({
        id: "doc-1",
        status: "approved",
        name: "Test Doc",
      });
      // approved → in_progress is not allowed
      const res = await PUT(
        makePut({ documentId: "doc-1", status: "in_progress" }),
        { params },
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Cannot transition");
    });

    it("allows valid document status transitions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationDocument.findFirst.mockResolvedValue({
        id: "doc-1",
        status: "not_started",
        name: "Test Doc",
      });
      mockPrisma.authorizationDocument.update.mockResolvedValue({
        id: "doc-1",
        status: "in_progress",
      });
      const res = await PUT(
        makePut({ documentId: "doc-1", status: "in_progress" }),
        { params },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.completeness).toBeDefined();
    });

    it("evaluates workflow transitions after document update", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationDocument.findFirst.mockResolvedValue({
        id: "doc-1",
        status: "in_progress",
        name: "Doc",
      });
      mockPrisma.authorizationDocument.update.mockResolvedValue({
        id: "doc-1",
        status: "ready",
      });
      await PUT(makePut({ documentId: "doc-1", status: "ready" }), { params });
      expect(mockEvaluateWorkflowTransitions).toHaveBeenCalledWith("wf-1");
    });
  });

  describe("POST (add custom document)", () => {
    function makePost(body: unknown): Request {
      return new Request(
        "https://app.caelex.com/api/authorization/wf-1/documents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await POST(makePost({}), { params })).status).toBe(401);
    });

    it("returns 400 on invalid input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await POST(makePost({}), { params })).status).toBe(400);
    });

    it("returns 404 when workflow not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const res = await POST(
        makePost({ name: "Custom Doc", documentType: "other" }),
        { params },
      );
      expect(res.status).toBe(404);
    });

    it("creates custom document on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationDocument.create.mockResolvedValue({
        id: "doc-2",
        name: "Custom Doc",
        status: "not_started",
      });
      const res = await POST(
        makePost({ name: "Custom Doc", documentType: "other" }),
        { params },
      );
      expect(res.status).toBe(200);
    });
  });
});
