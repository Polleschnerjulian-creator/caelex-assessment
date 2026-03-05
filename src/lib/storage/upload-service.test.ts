import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockSend = vi.fn().mockResolvedValue({});
const mockGetSignedUrl = vi
  .fn()
  .mockResolvedValue("https://signed-url.example.com");

// Track constructor calls for AWS SDK commands
const { commandCalls, makeCommandClass } = vi.hoisted(() => {
  const commandCalls: Record<string, any[]> = {
    PutObjectCommand: [],
    GetObjectCommand: [],
    DeleteObjectCommand: [],
    HeadObjectCommand: [],
  };

  function makeCommandClass(name: string) {
    return class {
      input: any;
      constructor(input: any) {
        this.input = input;
        commandCalls[name].push(input);
      }
    };
  }

  return { commandCalls, makeCommandClass };
});

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: makeCommandClass("PutObjectCommand"),
  GetObjectCommand: makeCommandClass("GetObjectCommand"),
  DeleteObjectCommand: makeCommandClass("DeleteObjectCommand"),
  HeadObjectCommand: makeCommandClass("HeadObjectCommand"),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

const mockGetR2Client = vi.fn(() => ({ send: mockSend }));
const mockGetR2BucketName = vi.fn(() => "test-bucket");
const mockGetR2PublicUrl = vi.fn(() => null);
const mockIsR2Configured = vi.fn(() => true);
const mockIsAllowedMimeType = vi.fn((type: string) =>
  ["application/pdf", "image/png"].includes(type),
);
const mockIsFileSizeAllowed = vi.fn((size: number) => size <= 50 * 1024 * 1024);

vi.mock("./r2-client", () => ({
  getR2Client: (...args: unknown[]) => mockGetR2Client(...args),
  getR2BucketName: (...args: unknown[]) => mockGetR2BucketName(...args),
  getR2PublicUrl: (...args: unknown[]) => mockGetR2PublicUrl(...args),
  isR2Configured: (...args: unknown[]) => mockIsR2Configured(...args),
  isAllowedMimeType: (...args: unknown[]) => mockIsAllowedMimeType(...args),
  isFileSizeAllowed: (...args: unknown[]) => mockIsFileSizeAllowed(...args),
  ALLOWED_MIME_TYPES: ["application/pdf", "image/png"],
  MAX_FILE_SIZE: 50 * 1024 * 1024,
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

// ─── Module under test ───

import {
  validateUpload,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getPublicFileUrl,
  deleteFile,
  getFileMetadata,
  fileExists,
  isR2Configured,
} from "./upload-service";

// ─── Tests ───

describe("upload-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear command call tracking
    for (const key of Object.keys(commandCalls)) {
      commandCalls[key] = [];
    }
    mockGetR2Client.mockReturnValue({ send: mockSend });
    mockIsR2Configured.mockReturnValue(true);
    mockIsAllowedMimeType.mockImplementation((type: string) =>
      ["application/pdf", "image/png"].includes(type),
    );
    mockIsFileSizeAllowed.mockImplementation(
      (size: number) => size <= 50 * 1024 * 1024,
    );
    mockGetR2PublicUrl.mockReturnValue(null);
    mockSend.mockResolvedValue({});
  });

  // ─── validateUpload ───

  describe("validateUpload", () => {
    it("returns valid for allowed MIME type and size", () => {
      const result = validateUpload("application/pdf", 1024);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns invalid for disallowed MIME type", () => {
      const result = validateUpload("text/plain", 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File type not allowed");
    });

    it("returns invalid for file too large", () => {
      mockIsAllowedMimeType.mockReturnValue(true);
      mockIsFileSizeAllowed.mockReturnValue(false);
      const result = validateUpload("application/pdf", 999999999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
    });
  });

  // ─── generatePresignedUploadUrl ───

  describe("generatePresignedUploadUrl", () => {
    it("generates a presigned upload URL for valid input", async () => {
      const result = await generatePresignedUploadUrl(
        "org-123",
        "authorization",
        "document.pdf",
        "application/pdf",
        1024,
      );

      expect(result.uploadUrl).toBe("https://signed-url.example.com");
      expect(result.fileKey).toContain("org-123/authorization/");
      expect(result.fileKey).toContain("document.pdf");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("uses custom documentId when provided", async () => {
      const result = await generatePresignedUploadUrl(
        "org-123",
        "cybersecurity",
        "report.pdf",
        "application/pdf",
        1024,
        "custom-doc-id",
      );

      expect(result.fileKey).toContain("custom-doc-id");
    });

    it("uses uuid when documentId is not provided", async () => {
      const result = await generatePresignedUploadUrl(
        "org-123",
        "environmental",
        "data.pdf",
        "application/pdf",
        1024,
      );

      expect(result.fileKey).toContain("mock-uuid-1234");
    });

    it("sanitizes filenames with special characters", async () => {
      const result = await generatePresignedUploadUrl(
        "org-123",
        "general",
        "my file (1) [final].pdf",
        "application/pdf",
        1024,
      );

      expect(result.fileKey).toContain("my_file__1___final_.pdf");
    });

    it("throws when MIME type is not allowed", async () => {
      await expect(
        generatePresignedUploadUrl(
          "org-123",
          "general",
          "file.txt",
          "text/plain",
          1024,
        ),
      ).rejects.toThrow("File type not allowed");
    });

    it("throws when file size exceeds limit", async () => {
      mockIsAllowedMimeType.mockReturnValue(true);
      mockIsFileSizeAllowed.mockReturnValue(false);

      await expect(
        generatePresignedUploadUrl(
          "org-123",
          "general",
          "big.pdf",
          "application/pdf",
          999999999,
        ),
      ).rejects.toThrow("File too large");
    });

    it("throws when R2 is not configured", async () => {
      mockIsR2Configured.mockReturnValue(false);

      await expect(
        generatePresignedUploadUrl(
          "org-123",
          "general",
          "file.pdf",
          "application/pdf",
          1024,
        ),
      ).rejects.toThrow("R2 storage not configured");
    });

    it("throws when R2 client is null", async () => {
      mockGetR2Client.mockReturnValue(null);

      await expect(
        generatePresignedUploadUrl(
          "org-123",
          "general",
          "file.pdf",
          "application/pdf",
          1024,
        ),
      ).rejects.toThrow("Failed to initialize R2 client");
    });

    it("respects custom expiresInSeconds", async () => {
      const customExpiry = 7200;
      const result = await generatePresignedUploadUrl(
        "org-123",
        "general",
        "file.pdf",
        "application/pdf",
        1024,
        undefined,
        customExpiry,
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: customExpiry },
      );

      // Verify expiresAt is roughly correct
      const expectedExpiry = Date.now() + customExpiry * 1000;
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);
    });
  });

  // ─── generatePresignedDownloadUrl ───

  describe("generatePresignedDownloadUrl", () => {
    it("generates a presigned download URL", async () => {
      const result = await generatePresignedDownloadUrl(
        "org-123/general/doc-1/file.pdf",
      );

      expect(result.downloadUrl).toBe("https://signed-url.example.com");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("includes downloadFilename in content disposition", async () => {
      await generatePresignedDownloadUrl(
        "org-123/general/doc-1/file.pdf",
        3600,
        "custom-download-name.pdf",
      );

      // Verify GetObjectCommand was called with ResponseContentDisposition
      expect(commandCalls.GetObjectCommand.length).toBeGreaterThan(0);
      expect(commandCalls.GetObjectCommand[0]).toEqual(
        expect.objectContaining({
          ResponseContentDisposition:
            'attachment; filename="custom-download-name.pdf"',
        }),
      );
    });

    it("does not include ResponseContentDisposition when no download filename", async () => {
      await generatePresignedDownloadUrl("org-123/general/doc-1/file.pdf");

      expect(commandCalls.GetObjectCommand.length).toBeGreaterThan(0);
      const callArg = commandCalls.GetObjectCommand[0];
      expect(callArg.ResponseContentDisposition).toBeUndefined();
    });

    it("throws when R2 is not configured", async () => {
      mockIsR2Configured.mockReturnValue(false);

      await expect(generatePresignedDownloadUrl("some/key")).rejects.toThrow(
        "R2 storage not configured",
      );
    });

    it("throws when R2 client is null", async () => {
      mockGetR2Client.mockReturnValue(null);

      await expect(generatePresignedDownloadUrl("some/key")).rejects.toThrow(
        "Failed to initialize R2 client",
      );
    });
  });

  // ─── getPublicFileUrl ───

  describe("getPublicFileUrl", () => {
    it("returns null when no public URL is configured", () => {
      const result = getPublicFileUrl("org-123/general/doc-1/file.pdf");
      expect(result).toBeNull();
    });

    it("returns the full public URL when configured", () => {
      mockGetR2PublicUrl.mockReturnValue("https://public.r2.example.com");

      const result = getPublicFileUrl("org-123/general/doc-1/file.pdf");
      expect(result).toBe(
        "https://public.r2.example.com/org-123/general/doc-1/file.pdf",
      );
    });
  });

  // ─── deleteFile ───

  describe("deleteFile", () => {
    it("deletes a file successfully", async () => {
      await deleteFile("org-123/general/doc-1/file.pdf");

      expect(mockSend).toHaveBeenCalled();
    });

    it("throws when R2 is not configured", async () => {
      mockIsR2Configured.mockReturnValue(false);

      await expect(deleteFile("some/key")).rejects.toThrow(
        "R2 storage not configured",
      );
    });

    it("throws when R2 client is null", async () => {
      mockGetR2Client.mockReturnValue(null);

      await expect(deleteFile("some/key")).rejects.toThrow(
        "Failed to initialize R2 client",
      );
    });
  });

  // ─── getFileMetadata ───

  describe("getFileMetadata", () => {
    it("returns metadata for an existing file", async () => {
      const mockResponse = {
        ContentType: "application/pdf",
        ContentLength: 12345,
        LastModified: new Date("2025-06-01"),
        ETag: '"abc123"',
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await getFileMetadata("org-123/general/doc-1/file.pdf");

      expect(result).toEqual({
        contentType: "application/pdf",
        contentLength: 12345,
        lastModified: new Date("2025-06-01"),
        etag: '"abc123"',
      });
    });

    it("returns defaults when response has missing fields", async () => {
      mockSend.mockResolvedValue({});

      const result = await getFileMetadata("org-123/general/doc-1/file.pdf");

      expect(result).toEqual({
        contentType: "application/octet-stream",
        contentLength: 0,
        lastModified: expect.any(Date),
        etag: undefined,
      });
    });

    it("returns null for NotFound error", async () => {
      const notFoundError = new Error("Not Found");
      (notFoundError as any).name = "NotFound";
      mockSend.mockRejectedValue(notFoundError);

      const result = await getFileMetadata("org-123/nonexistent/file.pdf");

      expect(result).toBeNull();
    });

    it("rethrows non-NotFound errors", async () => {
      mockSend.mockRejectedValue(new Error("Access Denied"));

      await expect(
        getFileMetadata("org-123/general/doc-1/file.pdf"),
      ).rejects.toThrow("Access Denied");
    });

    it("throws when R2 is not configured", async () => {
      mockIsR2Configured.mockReturnValue(false);

      await expect(getFileMetadata("some/key")).rejects.toThrow(
        "R2 storage not configured",
      );
    });

    it("throws when R2 client is null", async () => {
      mockGetR2Client.mockReturnValue(null);

      await expect(getFileMetadata("some/key")).rejects.toThrow(
        "Failed to initialize R2 client",
      );
    });
  });

  // ─── fileExists ───

  describe("fileExists", () => {
    it("returns true when file metadata is found", async () => {
      mockSend.mockResolvedValue({
        ContentType: "application/pdf",
        ContentLength: 1024,
        LastModified: new Date(),
      });

      const result = await fileExists("org-123/general/doc-1/file.pdf");
      expect(result).toBe(true);
    });

    it("returns false when file is not found", async () => {
      const notFoundError = new Error("Not Found");
      (notFoundError as any).name = "NotFound";
      mockSend.mockRejectedValue(notFoundError);

      const result = await fileExists("org-123/nonexistent/file.pdf");
      expect(result).toBe(false);
    });
  });

  // ─── re-export ───

  describe("re-exports", () => {
    it("re-exports isR2Configured", () => {
      expect(typeof isR2Configured).toBe("function");
      expect(isR2Configured()).toBe(true);
    });
  });
});
