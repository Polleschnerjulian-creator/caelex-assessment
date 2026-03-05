import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    documentAccessLog: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// ─── Mock Organization Guard ───
vi.mock("@/lib/middleware/organization-guard", () => ({
  getCurrentOrganization: vi.fn().mockResolvedValue({
    userId: "test-user-id",
    organizationId: "ctest123org",
    role: "OWNER",
    permissions: ["*"],
    organization: {
      id: "ctest123org",
      name: "Test Org",
      slug: "test-org",
      plan: "PROFESSIONAL",
      isActive: true,
    },
  }),
  verifyOrganizationAccess: vi.fn().mockResolvedValue({ success: true }),
  withOrganizationGuard: vi.fn(),
}));

// ─── Mock Logger ───
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
  },
}));

// ─── Mock R2 / S3 storage ───
vi.mock("@/lib/storage/r2-client", () => ({
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  getR2Client: vi.fn().mockReturnValue(null),
  getR2BucketName: vi.fn().mockReturnValue("test-bucket"),
  isR2Configured: vi.fn().mockReturnValue(false),
}));

// ─── Mock AWS SDK ───
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/documents/route";

// ─── Helpers ───

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockDocument = {
  id: "doc-new",
  userId: "test-user-id",
  name: "Test Document",
  description: null,
  fileName: "test.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  category: "LICENSE",
  subcategory: null,
  status: "DRAFT",
  tags: [],
  storagePath: "documents/test-user-id/12345-test.pdf",
  checksum: "abc123",
  issueDate: null,
  expiryDate: null,
  isExpired: false,
  isLatest: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeUploadRequest(
  fields: Record<string, string>,
  file?: File,
): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) {
    formData.append("file", file);
  }
  return new Request("http://localhost/api/documents", {
    method: "POST",
    body: formData,
  });
}

// ─── Tests ───

describe("POST /api/documents (upload)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
    vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any);
  });

  // ─── Authentication ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeUploadRequest({ name: "Doc", category: "LICENSE" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Missing Required Fields ───

  it("should return 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({ category: "LICENSE" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("should return 400 when category is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({ name: "Test Doc" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  // ─── Upload Without File ───

  it("should create document without file", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({
      name: "Test Document",
      category: "LICENSE",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.document).toBeDefined();
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user-id",
        name: "Test Document",
        category: "LICENSE",
        status: "DRAFT",
      }),
    });
  });

  // NOTE: Tests for file upload with actual File objects (valid PDF, file too large,
  // disallowed MIME type, magic number mismatch) are skipped because jsdom does not
  // properly support FormData + File serialization for Request.formData().
  // These scenarios should be covered in E2E tests with a real Node.js runtime.

  // ─── Audit Logging ───

  it("should log audit event on document upload", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({
      name: "Audit Test",
      category: "LICENSE",
    });
    await POST(request);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user-id",
        action: "document_uploaded",
        entityType: "document",
        entityId: mockDocument.id,
      }),
    });
  });

  it("should log document access event on upload", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({
      name: "Access Test",
      category: "LICENSE",
    });
    await POST(request);

    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: mockDocument.id,
        userId: "test-user-id",
        action: "VERSION_CREATED",
      }),
    });
  });

  // ─── Full Metadata ───

  it("should create document with all metadata fields", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeUploadRequest({
      name: "Full Metadata Doc",
      description: "Complete metadata test",
      category: "LICENSE",
      subcategory: "Operating",
      moduleType: "AUTHORIZATION",
      issueDate: "2024-01-01",
      expiryDate: "2025-12-31",
      regulatoryRef: "Art. 6",
      tags: "compliance,authorization,eu-space-act",
    });
    await POST(request);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Full Metadata Doc",
        description: "Complete metadata test",
        category: "LICENSE",
        subcategory: "Operating",
        moduleType: "AUTHORIZATION",
        issueDate: expect.any(Date),
        expiryDate: expect.any(Date),
        regulatoryRef: "Art. 6",
        tags: ["compliance", "authorization", "eu-space-act"],
      }),
    });
  });

  // ─── Database Error ───

  it("should return 500 when database create fails", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.create).mockRejectedValue(
      new Error("Database connection lost"),
    );

    const request = makeUploadRequest({
      name: "Error Doc",
      category: "LICENSE",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to upload document");
  });
});
