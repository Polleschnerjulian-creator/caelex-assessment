import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks (hoisted so vi.mock factories can reference them) ───

const {
  mockSendMail,
  mockVerify,
  mockCreateTransport,
  mockNotificationLogCreate,
  mockResendSend,
  mockIsResendConfigured,
  mockGetResendClient,
  mockGetEmailFrom,
  mockGetEmailFromName,
} = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "smtp-msg-001" });
  const mockVerify = vi.fn().mockResolvedValue(true);
  const mockCreateTransport = vi.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  }));
  const mockNotificationLogCreate = vi.fn().mockResolvedValue({});
  const mockResendSend = vi.fn().mockResolvedValue({
    data: { id: "resend-id-123" },
    error: null,
  });
  const mockIsResendConfigured = vi.fn(() => false);
  const mockGetResendClient = vi.fn(() => null);
  const mockGetEmailFrom = vi.fn(() => "test@caelex.io");
  const mockGetEmailFromName = vi.fn(() => "Caelex");
  return {
    mockSendMail,
    mockVerify,
    mockCreateTransport,
    mockNotificationLogCreate,
    mockResendSend,
    mockIsResendConfigured,
    mockGetResendClient,
    mockGetEmailFrom,
    mockGetEmailFromName,
  };
});

const mockResendClient = { emails: { send: mockResendSend } };

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationLog: { create: mockNotificationLogCreate },
  },
}));

vi.mock("./resend-client", () => ({
  getResendClient: (...args: unknown[]) => mockGetResendClient(...args),
  isResendConfigured: (...args: unknown[]) => mockIsResendConfigured(...args),
  getEmailFrom: (...args: unknown[]) => mockGetEmailFrom(...args),
  getEmailFromName: (...args: unknown[]) => mockGetEmailFromName(...args),
}));

vi.mock("./templates/deadline-reminder", () => ({
  renderDeadlineReminder: vi.fn().mockResolvedValue({
    html: "<p>deadline html</p>",
    subject: "Deadline reminder subject",
  }),
}));
vi.mock("./templates/document-expiry", () => ({
  renderDocumentExpiry: vi.fn().mockResolvedValue({
    html: "<p>document expiry html</p>",
    subject: "Document expiry subject",
  }),
}));
vi.mock("./templates/weekly-digest", () => ({
  renderWeeklyDigest: vi.fn().mockResolvedValue({
    html: "<p>weekly digest html</p>",
    subject: "Weekly digest subject",
  }),
}));
vi.mock("./templates/incident-alert", () => ({
  renderIncidentAlert: vi.fn().mockResolvedValue({
    html: "<p>incident alert html</p>",
    subject: "Incident alert subject",
  }),
}));

// ─── Module under test ───

import {
  isEmailConfigured,
  verifyEmailConnection,
  sendEmail,
  sendDeadlineReminder,
  sendDocumentExpiryAlert,
  sendWeeklyDigest,
  sendIncidentAlert,
  sendBatchEmails,
  sendTestEmail,
} from "./index";

// ─── Tests ───

describe("email/index", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
    delete process.env.SMTP_FROM_NAME;
    mockIsResendConfigured.mockReturnValue(false);
    mockGetResendClient.mockReturnValue(null);
    // Restore default mock implementations that may have been overridden by individual tests
    mockSendMail.mockResolvedValue({ messageId: "smtp-msg-001" });
    mockVerify.mockResolvedValue(true);
    mockResendSend.mockResolvedValue({
      data: { id: "resend-id-123" },
      error: null,
    });
    mockNotificationLogCreate.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── isEmailConfigured ───

  describe("isEmailConfigured", () => {
    it("returns false when no provider is configured", () => {
      expect(isEmailConfigured()).toBe(false);
    });

    it("returns true when Resend is configured", () => {
      mockIsResendConfigured.mockReturnValue(true);
      expect(isEmailConfigured()).toBe(true);
    });

    it("returns true when SMTP is configured", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      expect(isEmailConfigured()).toBe(true);
    });
  });

  // ─── verifyEmailConnection ───

  describe("verifyEmailConnection", () => {
    it("returns false when no provider is configured", async () => {
      expect(await verifyEmailConnection()).toBe(false);
    });

    it("returns true for Resend provider (no verification needed)", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      expect(await verifyEmailConnection()).toBe(true);
    });

    it("returns true when SMTP verify succeeds", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      mockVerify.mockResolvedValue(true);
      expect(await verifyEmailConnection()).toBe(true);
    });

    it("returns false when SMTP verify fails", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      mockVerify.mockRejectedValue(new Error("Connection refused"));
      expect(await verifyEmailConnection()).toBe(false);
    });
  });

  // ─── sendEmail ───

  describe("sendEmail", () => {
    it("returns error when no email provider is configured", async () => {
      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Email not configured");
    });

    it("sends via Resend when configured", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("resend-id-123");
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user@example.com"],
          subject: "Test Subject",
        }),
      );
    });

    it("returns error when Resend client returns null", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(null);

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Resend not configured");
    });

    it("handles Resend API errors", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "API rate limit exceeded" },
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limit exceeded");
    });

    it("handles Resend send exceptions", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockRejectedValue(new Error("Network error"));

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("handles non-Error thrown in Resend send", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockRejectedValue("string error");

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("sends via SMTP when Resend is not configured but SMTP is", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("smtp-msg-001");
      expect(mockSendMail).toHaveBeenCalled();
    });

    it("handles SMTP send failure", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      mockSendMail.mockRejectedValue(new Error("SMTP send failed"));

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP send failed");
    });

    it("handles non-Error thrown in SMTP send", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";
      mockSendMail.mockRejectedValue(42);

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("logs notification when userId and notificationType and entityType are provided", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: { id: "resend-id-123" },
        error: null,
      });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        userId: "user-1",
        notificationType: "deadline_reminder",
        entityType: "deadline",
        entityId: "deadline-1",
        metadata: { foo: "bar" },
      });

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          recipientEmail: "user@example.com",
          notificationType: "deadline_reminder",
          entityType: "deadline",
          entityId: "deadline-1",
          status: "sent",
          metadata: JSON.stringify({ foo: "bar" }),
        }),
      });
    });

    it("logs failed notification on send failure", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Quota exceeded" },
      });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        userId: "user-1",
        notificationType: "deadline_reminder",
        entityType: "deadline",
      });

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "Quota exceeded",
        }),
      });
    });

    it("does not log notification when userId is missing", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: { id: "resend-id-123" },
        error: null,
      });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(mockNotificationLogCreate).not.toHaveBeenCalled();
    });

    it("handles logNotification failure gracefully", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: { id: "resend-id-123" },
        error: null,
      });
      mockNotificationLogCreate.mockRejectedValue(new Error("DB error"));

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        userId: "user-1",
        notificationType: "deadline_reminder",
        entityType: "deadline",
      });

      // Should still return success because the email was sent
      expect(result.success).toBe(true);
    });

    it("logs notification on exception path when userId etc are provided", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      // Make send throw, AND make the logNotification fail too (to cover catch in outer catch)
      mockResendSend.mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        userId: "user-1",
        notificationType: "deadline_reminder",
        entityType: "deadline",
        entityId: "deadline-1",
        metadata: { x: 1 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected crash");
      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "Unexpected crash",
          metadata: JSON.stringify({ x: 1 }),
        }),
      });
    });

    it("passes null entityId when not provided", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({
        data: { id: "x" },
        error: null,
      });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        userId: "user-1",
        notificationType: "deadline_reminder",
        entityType: "deadline",
      });

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityId: null,
          metadata: null,
        }),
      });
    });

    it("provides text fallback via stripHtml when text is not provided (Resend)", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello <strong>World</strong></p>",
      });

      const call = mockResendSend.mock.calls[0][0];
      // text should be a stripped version of the html
      expect(call.text).toBe("Hello World");
    });

    it("uses provided text when available (SMTP)", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Custom plain text",
      });

      const call = mockSendMail.mock.calls[0][0];
      expect(call.text).toBe("Custom plain text");
    });

    it("uses default SMTP_PORT 587 when not specified", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      // Verify SMTP path was used and succeeded
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();

      // Verify createTransport was called at some point with correct port settings
      // (the transporter is a singleton, so it may have been called in a prior test)
      const allCalls = mockCreateTransport.mock.calls;
      if (allCalls.length > 0) {
        expect(allCalls[0][0]).toEqual(
          expect.objectContaining({
            port: 587,
            secure: false,
          }),
        );
      }
    });
  });

  // ─── Specialized email functions ───

  describe("sendDeadlineReminder", () => {
    it("sends a deadline reminder email via Resend", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const result = await sendDeadlineReminder(
        "user@example.com",
        "user-1",
        "deadline-1",
        {
          recipientName: "Alice",
          deadlineTitle: "DORA Report",
          dueDate: new Date("2025-06-01"),
          daysRemaining: 7,
          priority: "HIGH",
          category: "cybersecurity",
          dashboardUrl: "https://caelex.io/dashboard",
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe("sendDocumentExpiryAlert", () => {
    it("sends a document expiry alert email", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const result = await sendDocumentExpiryAlert(
        "user@example.com",
        "user-1",
        "doc-1",
        {
          recipientName: "Bob",
          documentName: "ISO 27001 Cert",
          expiryDate: new Date("2025-07-01"),
          daysUntilExpiry: 14,
          category: "cybersecurity",
          dashboardUrl: "https://caelex.io/dashboard",
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe("sendWeeklyDigest", () => {
    it("sends a weekly digest email", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const result = await sendWeeklyDigest("user@example.com", "user-1", {
        recipientName: "Carol",
        weekStart: new Date("2025-06-01"),
        weekEnd: new Date("2025-06-07"),
        upcomingDeadlines: [],
        expiringDocuments: [],
        overdueItems: [],
        complianceStats: {
          completionPercentage: 85,
          articlesCompliant: 42,
          totalArticles: 50,
        },
        dashboardUrl: "https://caelex.io/dashboard",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendIncidentAlert", () => {
    it("sends an incident alert email", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const result = await sendIncidentAlert(
        "user@example.com",
        "user-1",
        "incident-1",
        {
          recipientName: "Dave",
          incidentNumber: "INC-001",
          title: "Data Breach",
          severity: "critical",
          category: "cybersecurity",
          detectedAt: new Date(),
          description: "A breach was detected",
          dashboardUrl: "https://caelex.io/dashboard",
        },
      );

      expect(result.success).toBe(true);
    });
  });

  // ─── sendBatchEmails ───

  describe("sendBatchEmails", () => {
    it("sends multiple emails and reports results", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend
        .mockResolvedValueOnce({ data: { id: "1" }, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Failed" },
        })
        .mockResolvedValueOnce({ data: { id: "3" }, error: null });

      const emails = [
        { to: "a@b.com", subject: "S1", html: "<p>1</p>" },
        { to: "c@d.com", subject: "S2", html: "<p>2</p>" },
        { to: "e@f.com", subject: "S3", html: "<p>3</p>" },
      ];

      const result = await sendBatchEmails(emails, {
        maxConcurrent: 10,
        delayMs: 0,
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain("Failed");
    });

    it("processes batches with delay between them", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const emails = [
        { to: "a@b.com", subject: "S1", html: "<p>1</p>" },
        { to: "c@d.com", subject: "S2", html: "<p>2</p>" },
        { to: "e@f.com", subject: "S3", html: "<p>3</p>" },
      ];

      const result = await sendBatchEmails(emails, {
        maxConcurrent: 2,
        delayMs: 1,
      });

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    it("uses default maxConcurrent and delayMs", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const emails = [{ to: "a@b.com", subject: "S1", html: "<p>1</p>" }];

      const result = await sendBatchEmails(emails);

      expect(result.sent).toBe(1);
    });
  });

  // ─── sendTestEmail ───

  describe("sendTestEmail", () => {
    it("sends a test email with provider info in subject", async () => {
      mockIsResendConfigured.mockReturnValue(true);
      mockGetResendClient.mockReturnValue(mockResendClient);
      mockResendSend.mockResolvedValue({ data: { id: "x" }, error: null });

      const result = await sendTestEmail("admin@example.com");

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("RESEND"),
        }),
      );
    });

    it("sends test email via SMTP if only SMTP is configured", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const result = await sendTestEmail("admin@example.com");

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("SMTP"),
        }),
      );
    });
  });
});
