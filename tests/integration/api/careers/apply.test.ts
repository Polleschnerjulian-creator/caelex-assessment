import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Rate Limiting ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi
    .fn()
    .mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
      limit: 100,
    }),
  getIdentifier: vi.fn().mockReturnValue("ip:127.0.0.1"),
  createRateLimitResponse: vi.fn(),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
}));

// ─── Mock Logger ───
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Mock Resend ───
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: (...args: unknown[]) => mockSend(...args),
    };
  },
}));

import { POST } from "@/app/api/careers/apply/route";

// ─── Helpers ───

function createFormData(fields: Record<string, string | File>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function makeRequest(formData: FormData): NextRequest {
  const req = new NextRequest("http://localhost/api/careers/apply", {
    method: "POST",
  });
  // Override formData() to avoid jsdom/Node hanging on FormData body parsing
  (req as unknown as { formData: () => Promise<FormData> }).formData = () =>
    Promise.resolve(formData);
  return req;
}

const validFields = {
  position: "CTO / Co-Founder",
  positionId: "cto-cofounder",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+49 170 1234567",
  linkedin: "https://linkedin.com/in/johndoe",
  location: "Munich, Germany",
  experience: "10",
  motivation:
    "I am passionate about space compliance and want to help build the future.",
  availability: "Immediately",
  salary: "120000",
  referral: "LinkedIn",
};

// ─── Tests ───

describe("POST /api/careers/apply", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "re_test_key_123",
    };
    mockSend.mockResolvedValue({ id: "email-123" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Success ───

  it("should submit application successfully with valid data", async () => {
    const formData = createFormData(validFields);
    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should send two emails: internal notification + applicant confirmation
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("should send internal notification email to careers@caelex.eu", async () => {
    const formData = createFormData(validFields);
    const request = makeRequest(formData);
    await POST(request);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("Caelex Careers"),
        to: ["careers@caelex.eu"],
        replyTo: "john.doe@example.com",
        subject: expect.stringContaining("CTO / Co-Founder"),
      }),
    );
  });

  it("should send confirmation email to applicant", async () => {
    const formData = createFormData(validFields);
    const request = makeRequest(formData);
    await POST(request);

    // Second call is the confirmation email
    expect(mockSend).toHaveBeenCalledTimes(2);
    const secondCall = mockSend.mock.calls[1][0];
    expect(secondCall.to).toEqual(["john.doe@example.com"]);
    expect(secondCall.subject).toContain("Application Received");
  });

  // ─── File Upload: Valid PDF ───

  it("should accept valid PDF resume", async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    const file = new File([pdfContent], "resume.pdf", {
      type: "application/pdf",
    });
    // Ensure arrayBuffer works in jsdom
    if (!file.arrayBuffer) {
      (file as unknown as Record<string, unknown>).arrayBuffer = () =>
        Promise.resolve(pdfContent.buffer);
    }

    const formData = createFormData(validFields);
    formData.set("resume", file);

    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Internal email should have attachment
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringContaining("resume"),
          }),
        ]),
      }),
    );
  });

  // ─── File Upload: Size Limit ───

  it("should return 400 when resume exceeds 10 MB", async () => {
    // Create a file larger than 10 MB
    const largeBuffer = new ArrayBuffer(11 * 1024 * 1024);
    const file = new File([largeBuffer], "large-resume.pdf", {
      type: "application/pdf",
    });

    const formData = createFormData(validFields);
    formData.set("resume", file);

    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("exceeds maximum size");
  });

  // ─── File Upload: Invalid MIME Type ───

  it("should return 400 for invalid MIME type (e.g., image/png)", async () => {
    const file = new File([new Uint8Array(100)], "photo.png", {
      type: "image/png",
    });

    const formData = createFormData(validFields);
    formData.set("resume", file);

    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("PDF or Word document");
  });

  // ─── File Upload: Invalid Extension ───

  it("should return 400 for invalid file extension (e.g., .exe)", async () => {
    const file = new File([new Uint8Array(100)], "malware.exe", {
      type: "application/pdf", // Spoofed MIME type
    });

    const formData = createFormData(validFields);
    formData.set("resume", file);

    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("PDF or Word document");
  });

  // ─── File Upload: Accept DOCX ───

  it("should accept valid DOCX resume", async () => {
    const docxContent = new Uint8Array(100);
    const file = new File([docxContent], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    // Ensure arrayBuffer works in jsdom
    if (!file.arrayBuffer) {
      (file as unknown as Record<string, unknown>).arrayBuffer = () =>
        Promise.resolve(docxContent.buffer);
    }

    const formData = createFormData(validFields);
    formData.set("resume", file);

    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  // ─── Resend Error ───

  it("should return 500 when email service fails", async () => {
    mockSend.mockRejectedValue(new Error("Resend API error"));

    const formData = createFormData(validFields);
    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to submit application");
  });

  // ─── Without Resume ───

  it("should submit application successfully without resume file", async () => {
    const formData = createFormData(validFields);
    // No resume file appended
    const request = makeRequest(formData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Internal email should have empty attachments
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [],
      }),
    );
  });
});
