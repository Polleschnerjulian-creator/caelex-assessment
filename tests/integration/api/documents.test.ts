import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    documentAccessLog: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/documents/route";
import { GET as getDashboard } from "@/app/api/documents/dashboard/route";
import { GET as getComplianceCheck } from "@/app/api/documents/compliance-check/route";
import {
  GET as getDocument,
  PATCH as patchDocument,
  DELETE as deleteDocument,
} from "@/app/api/documents/[id]/route";

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockDocument = {
  id: "doc-1",
  userId: "test-user-id",
  name: "Test Document",
  description: "A test document",
  fileName: "test.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  category: "LICENSE",
  subcategory: null,
  status: "ACTIVE",
  tags: [],
  issueDate: new Date("2024-01-01"),
  expiryDate: new Date("2025-01-01"),
  isExpired: false,
  isLatest: true,
  version: 1,
  moduleType: "AUTHORIZATION",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Documents API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/documents", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/documents");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return documents for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        mockDocument as any,
      ]);
      vi.mocked(prisma.document.count).mockResolvedValue(1);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request("http://localhost/api/documents");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toBeDefined();
      expect(data.total).toBe(1);
    });

    it("should filter documents by category", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        mockDocument as any,
      ]);
      vi.mocked(prisma.document.count).mockResolvedValue(1);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request(
        "http://localhost/api/documents?category=LICENSE",
      );
      const response = await GET(request);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "LICENSE",
          }),
        }),
      );
    });

    it("should filter documents by status", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request(
        "http://localhost/api/documents?status=ACTIVE",
      );
      await GET(request);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ACTIVE",
          }),
        }),
      );
    });

    it("should filter documents expiring within days", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request(
        "http://localhost/api/documents?expiringWithinDays=30",
      );
      await GET(request);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiryDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("should search documents by name", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request("http://localhost/api/documents?search=test");
      await GET(request);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        }),
      );
    });

    it("should handle pagination", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(100);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 0 });

      const request = new Request(
        "http://localhost/api/documents?limit=10&offset=20",
      );
      await GET(request);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should update expired documents", async () => {
      const expiredDoc = {
        ...mockDocument,
        id: "expired-doc",
        expiryDate: new Date("2020-01-01"),
        isExpired: false,
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        expiredDoc as any,
      ]);
      vi.mocked(prisma.document.count).mockResolvedValue(1);
      vi.mocked(prisma.document.updateMany).mockResolvedValue({ count: 1 });

      const request = new Request("http://localhost/api/documents");
      await GET(request);

      expect(prisma.document.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["expired-doc"] } },
        data: { isExpired: true, status: "EXPIRED" },
      });
    });
  });

  describe("POST /api/documents", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("name", "Test Doc");
      formData.append("category", "LICENSE");

      const request = new Request("http://localhost/api/documents", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when missing required fields", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const formData = new FormData();
      formData.append("name", "Test Doc");
      // Missing category

      const request = new Request("http://localhost/api/documents", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should create a document without file", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("name", "Test Document");
      formData.append("category", "LICENSE");

      const request = new Request("http://localhost/api/documents", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.document).toBeDefined();
    });

    it("should create a document with all metadata", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("name", "Test Document");
      formData.append("description", "Test description");
      formData.append("category", "LICENSE");
      formData.append("subcategory", "Operating");
      formData.append("moduleType", "AUTHORIZATION");
      formData.append("issueDate", "2024-01-01");
      formData.append("expiryDate", "2025-01-01");
      formData.append("regulatoryRef", "Art. 6");
      formData.append("tags", "compliance,authorization");

      const request = new Request("http://localhost/api/documents", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Document",
          description: "Test description",
          category: "LICENSE",
          subcategory: "Operating",
          moduleType: "AUTHORIZATION",
          issueDate: expect.any(Date),
          expiryDate: expect.any(Date),
          regulatoryRef: "Art. 6",
          tags: ["compliance", "authorization"],
        }),
      });
    });

    it("should log audit event on document creation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const formData = new FormData();
      formData.append("name", "Test Document");
      formData.append("category", "LICENSE");

      const request = new Request("http://localhost/api/documents", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "test-user-id",
          action: "document_uploaded",
          entityType: "document",
        }),
      });
    });
  });

  describe("GET /api/documents/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/documents/doc-1");
      const response = await getDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when document not found", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      const request = new Request("http://localhost/api/documents/nonexistent");
      const response = await getDocument(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Document not found");
    });

    it("should return document with related data", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        versions: [],
        comments: [],
        shares: [],
        accessLogs: [],
      } as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/documents/doc-1");
      const response = await getDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.document).toBeDefined();
      expect(data.document.id).toBe("doc-1");
    });

    it("should log view access", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        versions: [],
        comments: [],
        shares: [],
        accessLogs: [],
      } as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/documents/doc-1");
      await getDocument(request, { params: Promise.resolve({ id: "doc-1" }) });

      expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: "doc-1",
          userId: "test-user-id",
          action: "VIEW",
        }),
      });
    });
  });

  describe("PATCH /api/documents/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await patchDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(401);
    });

    it("should return 404 when document not found", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      const request = new Request(
        "http://localhost/api/documents/nonexistent",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated" }),
        },
      );

      const response = await patchDocument(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      expect(response.status).toBe(404);
    });

    it("should update allowed fields", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        mockDocument as any,
      );
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        name: "Updated Name",
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          description: "New description",
        }),
      });

      const response = await patchDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle status change to APPROVED", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        status: "PENDING_REVIEW",
      } as any);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        status: "APPROVED",
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/documents/doc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      await patchDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: expect.objectContaining({
          status: "APPROVED",
          approvedBy: "test-user-id",
          approvedAt: expect.any(Date),
        }),
      });
    });
  });

  describe("DELETE /api/documents/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/documents/doc-1", {
        method: "DELETE",
      });

      const response = await deleteDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(401);
    });

    it("should soft delete document by archiving", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(
        mockDocument as any,
      );
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        status: "ARCHIVED",
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
      vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost/api/documents/doc-1", {
        method: "DELETE",
      });

      const response = await deleteDocument(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { status: "ARCHIVED" },
      });
    });
  });

  describe("GET /api/documents/dashboard", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await getDashboard();
      expect(response.status).toBe(401);
    });

    it("should return dashboard stats", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.count).mockResolvedValue(10);
      vi.mocked(prisma.document.groupBy).mockResolvedValue([
        { category: "LICENSE", _count: { id: 5 } },
        { category: "CERTIFICATE", _count: { id: 5 } },
      ] as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);

      const response = await getDashboard();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.byCategory).toBeDefined();
    });
  });

  describe("GET /api/documents/compliance-check", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await getComplianceCheck();
      expect(response.status).toBe(401);
    });

    it("should return compliance check results", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        mockDocument as any,
      ]);

      const response = await getComplianceCheck();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overallCompleteness).toBeDefined();
      expect(data.moduleCompliance).toBeDefined();
      expect(Array.isArray(data.moduleCompliance)).toBe(true);
    });
  });
});
