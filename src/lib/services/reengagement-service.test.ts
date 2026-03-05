import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock signed-token
vi.mock("@/lib/signed-token", () => ({
  createUnsubscribeToken: vi.fn().mockReturnValue("mock-token-123"),
}));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { processReengagementEmails } from "./reengagement-service";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    isActive: true,
    lastReengagementStage: 0,
    notificationPreference: null,
    ...overrides,
  };
}

describe("Reengagement Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processReengagementEmails", () => {
    it("should return initial results when no users found", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      const results = await processReengagementEmails();

      expect(results.processed).toBe(0);
      expect(results.sent).toBe(0);
      expect(results.skipped).toBe(0);
      expect(results.errors).toHaveLength(0);
      // Called 3 times: once for each stage (7, 14, 30 days)
      expect(prisma.user.findMany).toHaveBeenCalledTimes(3);
    });

    it("should send email and update user on success for stage 1", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never) // stage 1
        .mockResolvedValueOnce([] as never) // stage 2
        .mockResolvedValueOnce([] as never); // stage 3
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processReengagementEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(1);
      expect(results.skipped).toBe(0);
      expect(results.errors).toHaveLength(0);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "We miss you — Here's what's happening at Caelex",
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          lastReengagementStage: 1,
        }),
      });
    });

    it("should send email for stage 2 with correct subject", async () => {
      const user = makeUser({ lastReengagementStage: 1 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never) // stage 1
        .mockResolvedValueOnce([user] as never) // stage 2
        .mockResolvedValueOnce([] as never); // stage 3
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processReengagementEmails();

      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "New features and updates you might have missed",
        }),
      );
      // Stage 2 template should mention "what's new"
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("what's new at Caelex");
      expect(emailCall.html).toContain("Test User");
    });

    it("should send email for stage 3 with correct subject and template", async () => {
      const user = makeUser({ lastReengagementStage: 2 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never) // stage 1
        .mockResolvedValueOnce([] as never) // stage 2
        .mockResolvedValueOnce([user] as never); // stage 3
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processReengagementEmails();

      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Special offer: Come back to Caelex",
        }),
      );
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("special offer");
      expect(emailCall.html).toContain("Test User");
    });

    it("should use 'there' when user has no name", async () => {
      const user = makeUser({ name: null });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processReengagementEmails();

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("there");
    });

    it("should skip user when emailEnabled is false", async () => {
      const user = makeUser({
        notificationPreference: { emailEnabled: false },
      });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const results = await processReengagementEmails();

      expect(results.processed).toBe(1);
      expect(results.skipped).toBe(1);
      expect(results.sent).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not skip user when notificationPreference is null", async () => {
      const user = makeUser({ notificationPreference: null });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processReengagementEmails();

      expect(results.sent).toBe(1);
      expect(results.skipped).toBe(0);
    });

    it("should push error when sendEmail returns success: false", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "SMTP error",
      } as never);

      const results = await processReengagementEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Failed for user-1");
      expect(results.errors[0]).toContain("SMTP error");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should push error when sendEmail throws", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockRejectedValue(new Error("Network failure"));

      const results = await processReengagementEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Error for user-1");
      expect(results.errors[0]).toContain("Network failure");
    });

    it("should push error with 'Unknown' when non-Error is thrown", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockRejectedValue("string error");

      const results = await processReengagementEmails();

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Unknown");
    });

    it("should process multiple users across multiple stages", async () => {
      const user1 = makeUser({ id: "user-1", lastReengagementStage: 0 });
      const user2 = makeUser({ id: "user-2", lastReengagementStage: 0 });
      const user3 = makeUser({ id: "user-3", lastReengagementStage: 1 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user1, user2] as never) // stage 1
        .mockResolvedValueOnce([user3] as never) // stage 2
        .mockResolvedValueOnce([] as never); // stage 3
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processReengagementEmails();

      expect(results.processed).toBe(3);
      expect(results.sent).toBe(3);
      expect(sendEmail).toHaveBeenCalledTimes(3);
    });

    it("should include unsubscribe link in email HTML", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processReengagementEmails();

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("Unsubscribe");
      expect(emailCall.html).toContain("mock-token-123");
    });

    it("should render stage 1 template with user name and dashboard link", async () => {
      const user = makeUser({ name: "Alice" });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processReengagementEmails();

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("We miss you, Alice!");
      expect(emailCall.html).toContain("/dashboard");
      expect(emailCall.html).toContain("Return to Dashboard");
    });
  });
});
