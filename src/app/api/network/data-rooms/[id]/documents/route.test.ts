/**
 * Data Room Documents Route Tests (GET, POST, DELETE)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: vi.fn(), findMany: vi.fn() },
    document: { findFirst: vi.fn() },
  },
}));

const mockGetDataRoom = vi.fn();
const mockGetDocuments = vi.fn();
const mockAddDocument = vi.fn();
const mockRemoveDocument = vi.fn();
vi.mock("@/lib/services/data-room", () => ({
  getDataRoom: (...a: unknown[]) => mockGetDataRoom(...a),
  getDocuments: (...a: unknown[]) => mockGetDocuments(...a),
  addDocument: (...a: unknown[]) => mockAddDocument(...a),
  removeDocument: (...a: unknown[]) => mockRemoveDocument(...a),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn((perms: string[], perm: string) => perms.includes(perm)),
  getPermissionsForRole: vi.fn((role: string) => {
    if (role === "OWNER" || role === "ADMIN")
      return ["network:read", "network:write"];
    if (role === "MEMBER") return ["network:read"];
    return [];
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST, DELETE } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organizationMember: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  document: { findFirst: ReturnType<typeof vi.fn> };
};

const params = Promise.resolve({ id: "dr-1" });

describe("Data Room Documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.organizationMember.findFirst.mockReset();
    mockPrisma.organizationMember.findMany.mockReset();
    mockPrisma.document.findFirst.mockReset();
    mockGetDataRoom.mockReset();
    mockGetDocuments.mockReset();
    mockAddDocument.mockReset();
    mockRemoveDocument.mockReset();
  });

  describe("GET", () => {
    function makeGet(orgId?: string): NextRequest {
      const url = new URL(
        "https://app.caelex.com/api/network/data-rooms/dr-1/documents",
      );
      if (orgId) url.searchParams.set("organizationId", orgId);
      return new NextRequest(url);
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await GET(makeGet("org-1"), { params })).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect((await GET(makeGet(), { params })).status).toBe(400);
    });

    it("returns 403 when not a member", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      expect((await GET(makeGet("org-1"), { params })).status).toBe(403);
    });

    it("returns 403 without network:read permission", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "VIEWER",
        permissions: [],
      });
      expect((await GET(makeGet("org-1"), { params })).status).toBe(403);
    });

    it("returns 404 when data room not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
        permissions: [],
      });
      mockGetDataRoom.mockResolvedValue(null);
      expect((await GET(makeGet("org-1"), { params })).status).toBe(404);
    });

    it("returns documents on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
        permissions: [],
      });
      mockGetDataRoom.mockResolvedValue({ id: "dr-1" });
      mockGetDocuments.mockResolvedValue([{ id: "doc-1", name: "Report" }]);
      const res = await GET(makeGet("org-1"), { params });
      expect(res.status).toBe(200);
      expect((await res.json()).documents).toHaveLength(1);
    });
  });

  describe("POST", () => {
    function makePost(body: unknown): NextRequest {
      return new NextRequest(
        "https://app.caelex.com/api/network/data-rooms/dr-1/documents",
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

    it("returns 403 without network:write permission", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "MEMBER",
        permissions: [],
      });
      const res = await POST(
        makePost({ organizationId: "org-1", documentId: "doc-1" }),
        { params },
      );
      expect(res.status).toBe(403);
    });

    it("prevents cross-org IDOR (document from different org)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
        permissions: [],
      });
      mockGetDataRoom.mockResolvedValue({ id: "dr-1" });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { userId: "u1" },
      ]);
      // Document belongs to a user NOT in this org
      mockPrisma.document.findFirst.mockResolvedValue(null);
      const res = await POST(
        makePost({ organizationId: "org-1", documentId: "doc-foreign" }),
        { params },
      );
      expect(res.status).toBe(404);
      expect((await res.json()).error).toContain(
        "not found in this organization",
      );
    });

    it("adds document on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
        permissions: [],
      });
      mockGetDataRoom.mockResolvedValue({ id: "dr-1" });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { userId: "u1" },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({ id: "doc-1" });
      mockAddDocument.mockResolvedValue({ id: "link-1" });
      const res = await POST(
        makePost({ organizationId: "org-1", documentId: "doc-1" }),
        { params },
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });
  });

  describe("DELETE", () => {
    function makeDel(body: unknown): NextRequest {
      return new NextRequest(
        "https://app.caelex.com/api/network/data-rooms/dr-1/documents",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    }

    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      expect((await DELETE(makeDel({}), { params })).status).toBe(401);
    });

    it("returns 400 without organizationId", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      expect(
        (await DELETE(makeDel({ documentId: "doc-1" }), { params })).status,
      ).toBe(400);
    });

    it("returns 403 without network:write permission", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "VIEWER",
        permissions: [],
      });
      const res = await DELETE(
        makeDel({ organizationId: "org-1", documentId: "doc-1" }),
        { params },
      );
      expect(res.status).toBe(403);
    });

    it("removes document on valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        role: "ADMIN",
        permissions: [],
      });
      mockGetDataRoom.mockResolvedValue({ id: "dr-1" });
      mockRemoveDocument.mockResolvedValue({});
      const res = await DELETE(
        makeDel({ organizationId: "org-1", documentId: "doc-1" }),
        { params },
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });
  });
});
