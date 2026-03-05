import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MockS3Client = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
}));

describe("r2-client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getR2Client", () => {
    it("returns null when R2 credentials are not configured", async () => {
      const { getR2Client } = await import("./r2-client");
      expect(getR2Client()).toBeNull();
    });

    it("returns null when only partial credentials are set", async () => {
      process.env.R2_ENDPOINT = "https://r2.example.com";
      // Missing ACCESS_KEY_ID and SECRET_ACCESS_KEY
      const { getR2Client } = await import("./r2-client");
      expect(getR2Client()).toBeNull();
    });

    it("creates and returns an S3Client when fully configured", async () => {
      process.env.R2_ENDPOINT = "https://r2.example.com";
      process.env.R2_ACCESS_KEY_ID = "access-key";
      process.env.R2_SECRET_ACCESS_KEY = "secret-key";

      const { getR2Client } = await import("./r2-client");
      const client = getR2Client();
      expect(client).not.toBeNull();
      expect(MockS3Client).toHaveBeenCalledWith({
        region: "auto",
        endpoint: "https://r2.example.com",
        credentials: {
          accessKeyId: "access-key",
          secretAccessKey: "secret-key",
        },
      });
    });

    it("returns the same singleton on subsequent calls", async () => {
      process.env.R2_ENDPOINT = "https://r2.example.com";
      process.env.R2_ACCESS_KEY_ID = "access-key";
      process.env.R2_SECRET_ACCESS_KEY = "secret-key";

      const { getR2Client } = await import("./r2-client");
      const client1 = getR2Client();
      const client2 = getR2Client();
      expect(client1).toBe(client2);
      expect(MockS3Client).toHaveBeenCalledTimes(1);
    });
  });

  describe("isR2Configured", () => {
    it("returns false when no env vars are set", async () => {
      const { isR2Configured } = await import("./r2-client");
      expect(isR2Configured()).toBe(false);
    });

    it("returns false when R2_BUCKET_NAME is missing", async () => {
      process.env.R2_ENDPOINT = "https://r2.example.com";
      process.env.R2_ACCESS_KEY_ID = "access-key";
      process.env.R2_SECRET_ACCESS_KEY = "secret-key";
      const { isR2Configured } = await import("./r2-client");
      expect(isR2Configured()).toBe(false);
    });

    it("returns true when all 4 env vars are set", async () => {
      process.env.R2_ENDPOINT = "https://r2.example.com";
      process.env.R2_ACCESS_KEY_ID = "access-key";
      process.env.R2_SECRET_ACCESS_KEY = "secret-key";
      process.env.R2_BUCKET_NAME = "test-bucket";
      const { isR2Configured } = await import("./r2-client");
      expect(isR2Configured()).toBe(true);
    });
  });

  describe("getR2BucketName", () => {
    it("returns default bucket name when env var is not set", async () => {
      const { getR2BucketName } = await import("./r2-client");
      expect(getR2BucketName()).toBe("caelex-documents");
    });

    it("returns custom bucket name when env var is set", async () => {
      process.env.R2_BUCKET_NAME = "custom-bucket";
      const { getR2BucketName } = await import("./r2-client");
      expect(getR2BucketName()).toBe("custom-bucket");
    });
  });

  describe("getR2PublicUrl", () => {
    it("returns null when R2_PUBLIC_URL is not set", async () => {
      const { getR2PublicUrl } = await import("./r2-client");
      expect(getR2PublicUrl()).toBeNull();
    });

    it("returns the public URL when set", async () => {
      process.env.R2_PUBLIC_URL = "https://public.r2.example.com";
      const { getR2PublicUrl } = await import("./r2-client");
      expect(getR2PublicUrl()).toBe("https://public.r2.example.com");
    });
  });

  describe("isAllowedMimeType", () => {
    it("returns true for application/pdf", async () => {
      const { isAllowedMimeType } = await import("./r2-client");
      expect(isAllowedMimeType("application/pdf")).toBe(true);
    });

    it("returns true for image/png", async () => {
      const { isAllowedMimeType } = await import("./r2-client");
      expect(isAllowedMimeType("image/png")).toBe(true);
    });

    it("returns true for docx MIME type", async () => {
      const { isAllowedMimeType } = await import("./r2-client");
      expect(
        isAllowedMimeType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe(true);
    });

    it("returns false for text/plain", async () => {
      const { isAllowedMimeType } = await import("./r2-client");
      expect(isAllowedMimeType("text/plain")).toBe(false);
    });

    it("returns false for application/zip", async () => {
      const { isAllowedMimeType } = await import("./r2-client");
      expect(isAllowedMimeType("application/zip")).toBe(false);
    });
  });

  describe("isFileSizeAllowed", () => {
    it("returns true for file size within limit", async () => {
      const { isFileSizeAllowed } = await import("./r2-client");
      expect(isFileSizeAllowed(1024)).toBe(true);
    });

    it("returns true for exactly MAX_FILE_SIZE", async () => {
      const { isFileSizeAllowed, MAX_FILE_SIZE } = await import("./r2-client");
      expect(isFileSizeAllowed(MAX_FILE_SIZE)).toBe(true);
    });

    it("returns false for file size exceeding limit", async () => {
      const { isFileSizeAllowed, MAX_FILE_SIZE } = await import("./r2-client");
      expect(isFileSizeAllowed(MAX_FILE_SIZE + 1)).toBe(false);
    });
  });

  describe("constants", () => {
    it("exports ALLOWED_MIME_TYPES with expected types", async () => {
      const { ALLOWED_MIME_TYPES } = await import("./r2-client");
      expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
      expect(ALLOWED_MIME_TYPES).toContain("image/png");
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES.length).toBeGreaterThan(5);
    });

    it("exports MAX_FILE_SIZE as 50MB", async () => {
      const { MAX_FILE_SIZE } = await import("./r2-client");
      expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });

    it("exports MIME_TO_EXTENSION mapping", async () => {
      const { MIME_TO_EXTENSION } = await import("./r2-client");
      expect(MIME_TO_EXTENSION["application/pdf"]).toBe(".pdf");
      expect(MIME_TO_EXTENSION["image/png"]).toBe(".png");
      expect(MIME_TO_EXTENSION["image/jpeg"]).toBe(".jpg");
    });
  });
});
