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

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { processOnboardingEmails } from "./onboarding-email-service";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    isActive: true,
    onboardingEmailStage: 0,
    createdAt: new Date("2025-01-01"),
    notificationPreference: null,
    ...overrides,
  };
}

describe("Onboarding Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processOnboardingEmails", () => {
    it("should return initial results when no users found", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(0);
      expect(results.sent).toBe(0);
      expect(results.skipped).toBe(0);
      expect(results.errors).toHaveLength(0);
      // 4 stages: welcome, first-assessment, modules, team
      expect(prisma.user.findMany).toHaveBeenCalledTimes(4);
    });

    it("should send welcome email (stage 1) and update user", async () => {
      const user = makeUser({ onboardingEmailStage: 0 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never) // stage 1 (welcome)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject:
            "Welcome to Caelex — Your Space Compliance Journey Starts Here",
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          onboardingEmailStage: 1,
        }),
      });
    });

    it("should send first-assessment email (stage 2)", async () => {
      const user = makeUser({ onboardingEmailStage: 1 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([user] as never) // stage 2
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Run Your First Compliance Assessment in 5 Minutes",
        }),
      );
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("Ready for Your First Assessment?");
      expect(emailCall.html).toContain("Test User");
    });

    it("should send modules email (stage 3)", async () => {
      const user = makeUser({ onboardingEmailStage: 2 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([user] as never) // stage 3
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Explore Your Compliance Modules",
        }),
      );
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("Explore Your Compliance Modules");
      expect(emailCall.html).toContain("8 compliance domains");
    });

    it("should send team invite email (stage 4)", async () => {
      const user = makeUser({ onboardingEmailStage: 3 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([user] as never); // stage 4
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Invite Your Team to Caelex",
        }),
      );
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("Invite Your Team");
      expect(emailCall.html).toContain("Invite Team Members");
    });

    it("should use 'there' when user has no name", async () => {
      const user = makeUser({ name: null });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processOnboardingEmails();

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
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(1);
      expect(results.skipped).toBe(1);
      expect(results.sent).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not skip when notificationPreference is null", async () => {
      const user = makeUser({ notificationPreference: null });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.sent).toBe(1);
      expect(results.skipped).toBe(0);
    });

    it("should push error when sendEmail returns success: false", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "Rate limited",
      } as never);

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Failed to send to user-1");
      expect(results.errors[0]).toContain("Rate limited");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should push error when sendEmail throws an Error", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockRejectedValue(new Error("Connection reset"));

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(1);
      expect(results.sent).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Error for user-1");
      expect(results.errors[0]).toContain("Connection reset");
    });

    it("should push error with 'Unknown' when non-Error is thrown", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockRejectedValue(42);

      const results = await processOnboardingEmails();

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Unknown");
    });

    it("should process multiple users across multiple stages", async () => {
      const u1 = makeUser({ id: "u1", onboardingEmailStage: 0 });
      const u2 = makeUser({ id: "u2", onboardingEmailStage: 0 });
      const u3 = makeUser({ id: "u3", onboardingEmailStage: 2 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([u1, u2] as never) // stage 1
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([u3] as never) // stage 3
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const results = await processOnboardingEmails();

      expect(results.processed).toBe(3);
      expect(results.sent).toBe(3);
      expect(sendEmail).toHaveBeenCalledTimes(3);
    });

    it("should include dashboard link in welcome email", async () => {
      const user = makeUser();
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([user] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processOnboardingEmails();

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("/dashboard");
      expect(emailCall.html).toContain("Go to Dashboard");
    });

    it("should update user with onboardingEmailStage for stage 4", async () => {
      const user = makeUser({ id: "user-4", onboardingEmailStage: 3 });
      vi.mocked(prisma.user.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([user] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await processOnboardingEmails();

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-4" },
        data: expect.objectContaining({
          onboardingEmailStage: 4,
        }),
      });
    });
  });
});
