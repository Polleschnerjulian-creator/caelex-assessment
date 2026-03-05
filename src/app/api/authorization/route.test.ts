/**
 * Authorization Workflow Route Tests (GET, POST)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test" }),
  generateAuditDescription: vi.fn().mockReturnValue("desc"),
}));

vi.mock("@/data/ncas", () => ({
  determineNCA: vi.fn().mockReturnValue({
    primaryNCA: { id: "bnetza", name: "BNetzA" },
    secondaryNCAs: [],
    pathway: "standard",
    relevantArticles: [],
    requirements: [],
    estimatedTimeline: "6 months",
    notes: [],
  }),
}));

vi.mock("@/data/authorization-documents", () => ({
  getRequiredDocuments: vi
    .fn()
    .mockReturnValue([
      {
        type: "application",
        name: "Application Form",
        description: "Main form",
        articleRef: "Art.5",
        required: true,
      },
    ]),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  authorizationWorkflow: { findMany: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("Authorization Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.authorizationWorkflow.findMany.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  describe("GET /api/authorization", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await GET()).status).toBe(401);
    });

    it("returns workflows for authenticated user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findMany.mockResolvedValue([
        { id: "wf-1", status: "in_progress" },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        operatorType: "SCO",
        establishmentCountry: "DE",
      });
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.workflows).toHaveLength(1);
      expect(body.user).toBeDefined();
    });

    it("returns 500 on error without leaking details", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.authorizationWorkflow.findMany.mockRejectedValue(
        new Error("DB fail"),
      );
      const res = await GET();
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain("DB fail");
    });
  });

  describe("POST /api/authorization", () => {
    function makePost(body: unknown): Request {
      return new Request("https://app.caelex.com/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await POST(makePost({}))).status).toBe(401);
    });

    it("returns 400 on invalid input (missing operatorType)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await POST(makePost({}))).status).toBe(400);
    });

    it("returns 400 when EU operator has no establishmentCountry", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(
        makePost({ operatorType: "SCO", isThirdCountry: false }),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("establishmentCountry");
    });

    it("creates workflow with NCA determination on valid input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const mockWorkflow = { id: "wf-1", documents: [] };
      mockPrisma.$transaction.mockImplementation(
        async (fn: (prisma: Record<string, unknown>) => unknown) => {
          return fn({
            authorizationWorkflow: {
              create: vi.fn().mockResolvedValue(mockWorkflow),
            },
            authorizationDocument: { create: vi.fn().mockResolvedValue({}) },
            user: { update: vi.fn().mockResolvedValue({}) },
          });
        },
      );
      const res = await POST(
        makePost({
          operatorType: "SCO",
          establishmentCountry: "DE",
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ncaDetermination.primaryNCA.name).toBe("BNetzA");
    });
  });
});
