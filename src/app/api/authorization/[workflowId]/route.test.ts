/**
 * Authorization Workflow [workflowId] Route Tests (GET, PUT, DELETE)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, PUT, DELETE } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  authorizationWorkflow: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const params = Promise.resolve({ workflowId: "wf-1" });

describe("Authorization [workflowId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.authorizationWorkflow.findFirst.mockReset();
    mockPrisma.authorizationWorkflow.update.mockReset();
    mockPrisma.authorizationWorkflow.delete.mockReset();
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = new Request("https://app.caelex.com/api/authorization/wf-1");
      expect((await GET(req, { params })).status).toBe(401);
    });

    it("returns 404 when workflow not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const req = new Request("https://app.caelex.com/api/authorization/wf-1");
      expect((await GET(req, { params })).status).toBe(404);
    });

    it("returns 404 when workflow belongs to another user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      // findFirst with userId filter returns null for non-owner
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const req = new Request("https://app.caelex.com/api/authorization/wf-1");
      expect((await GET(req, { params })).status).toBe(404);
    });

    it("returns workflow on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
        status: "in_progress",
        documents: [],
      });
      const req = new Request("https://app.caelex.com/api/authorization/wf-1");
      const res = await GET(req, { params });
      expect(res.status).toBe(200);
    });
  });

  describe("PUT", () => {
    function makePut(body: unknown): Request {
      return new Request("https://app.caelex.com/api/authorization/wf-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await PUT(makePut({}), { params })).status).toBe(401);
    });

    it("returns 400 on invalid status value", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PUT(makePut({ status: "invalid_status" }), { params });
      expect(res.status).toBe(400);
    });

    it("returns 404 when workflow not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const res = await PUT(makePut({ status: "in_progress" }), { params });
      expect(res.status).toBe(404);
    });

    it("rejects invalid status transitions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
        status: "approved",
        userId: "u1",
      });
      // approved → in_progress is not allowed
      const res = await PUT(makePut({ status: "in_progress" }), { params });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Cannot transition");
    });

    it("allows valid status transitions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
        status: "not_started",
        userId: "u1",
        startedAt: null,
      });
      mockPrisma.authorizationWorkflow.update.mockResolvedValue({
        id: "wf-1",
        status: "in_progress",
        documents: [],
      });
      const res = await PUT(makePut({ status: "in_progress" }), { params });
      expect(res.status).toBe(200);
    });

    it("sets startedAt timestamp on first in_progress", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
        status: "not_started",
        userId: "u1",
        startedAt: null,
      });
      mockPrisma.authorizationWorkflow.update.mockResolvedValue({
        id: "wf-1",
        status: "in_progress",
      });
      await PUT(makePut({ status: "in_progress" }), { params });
      expect(mockPrisma.authorizationWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe("DELETE", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = new Request("https://app.caelex.com/api/authorization/wf-1", {
        method: "DELETE",
      });
      expect((await DELETE(req, { params })).status).toBe(401);
    });

    it("returns 404 when workflow not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue(null);
      const req = new Request("https://app.caelex.com/api/authorization/wf-1", {
        method: "DELETE",
      });
      expect((await DELETE(req, { params })).status).toBe(404);
    });

    it("deletes workflow on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findFirst.mockResolvedValue({
        id: "wf-1",
      });
      mockPrisma.authorizationWorkflow.delete.mockResolvedValue({});
      const req = new Request("https://app.caelex.com/api/authorization/wf-1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });
  });
});
