/**
 * Pulse email dispatcher — unit tests.
 *
 * Coverage:
 *
 *   1. lead-not-found → reason: lead-not-found
 *   2. unsubscribed lead → reason: unsubscribed
 *   3. already-sent stage (idempotence) → reason: already-sent
 *   4. happy path: dispatches sendEmail + writes lastEmailStage
 *   5. sendEmail failure → reason: send-failed
 *   6. fireDay0Delivery never throws (catches internal exceptions)
 *   7. Builds context with proper URLs (reportUrl, signupUrl, demoUrl)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPulseLead, mockSendEmail } = vi.hoisted(() => ({
  mockPulseLead: { findUnique: vi.fn(), update: vi.fn() },
  mockSendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pulseLead: mockPulseLead },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { sendPulseEmail, fireDay0Delivery } from "./dispatcher.server";

const HAPPY_LEAD = {
  id: "cl_lead_xyz",
  legalName: "OneWeb Limited",
  email: "anna@example.com",
  detectionResult: {
    successfulSources: ["vies-eu-vat"],
    failedSources: [],
    mergedFields: [
      {
        fieldName: "establishment",
        value: "DE",
        agreementCount: 1,
      },
    ],
    warnings: [],
  },
  createdAt: new Date("2026-04-30T10:00:00Z"),
  unsubscribed: false,
  lastEmailStage: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://app.caelex.com";
  mockPulseLead.findUnique.mockResolvedValue(HAPPY_LEAD);
  mockPulseLead.update.mockResolvedValue({});
  mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_1" });
});

// ─── Skip paths ────────────────────────────────────────────────────────────

describe("sendPulseEmail — skip paths", () => {
  it("returns lead-not-found when lead doesn't exist", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce(null);
    const result = await sendPulseEmail("missing", "day0");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("lead-not-found");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns unsubscribed when lead.unsubscribed = true", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      unsubscribed: true,
    });
    const result = await sendPulseEmail(HAPPY_LEAD.id, "day0");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("unsubscribed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns already-sent when lastEmailStage >= requested stage", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      lastEmailStage: "day3",
    });
    const result = await sendPulseEmail(HAPPY_LEAD.id, "day1");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("already-sent");
  });

  it("allows day-3 send when lastEmailStage = day1", async () => {
    mockPulseLead.findUnique.mockResolvedValueOnce({
      ...HAPPY_LEAD,
      lastEmailStage: "day1",
    });
    const result = await sendPulseEmail(HAPPY_LEAD.id, "day3");
    expect(result.sent).toBe(true);
  });
});

// ─── Happy path ────────────────────────────────────────────────────────────

describe("sendPulseEmail — happy path", () => {
  it("dispatches sendEmail with rendered subject + html + text", async () => {
    await sendPulseEmail(HAPPY_LEAD.id, "day0");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const args = mockSendEmail.mock.calls[0][0];
    expect(args.to).toBe("anna@example.com");
    expect(args.subject).toContain("Pulse report");
    expect(args.html).toBeTruthy();
    expect(args.text).toBeTruthy();
    expect(args.notificationType).toBe("pulse_nurture");
    expect(args.entityType).toBe("pulse_lead");
    expect(args.entityId).toBe(HAPPY_LEAD.id);
  });

  it("writes lastEmailStage + lastEmailSentAt after a successful send", async () => {
    await sendPulseEmail(HAPPY_LEAD.id, "day0");
    expect(mockPulseLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: HAPPY_LEAD.id },
        data: expect.objectContaining({
          lastEmailStage: "day0",
          lastEmailSentAt: expect.any(Date),
        }),
      }),
    );
  });

  it("renders correct URLs in email body", async () => {
    await sendPulseEmail(HAPPY_LEAD.id, "day0");
    const args = mockSendEmail.mock.calls[0][0];
    expect(args.html).toContain(
      "https://app.caelex.com/api/public/pulse/report/cl_lead_xyz",
    );
    expect(args.html).toContain("/signup?leadId=cl_lead_xyz");
    expect(args.html).toContain("/demo?leadId=cl_lead_xyz");
  });
});

// ─── Failure path ──────────────────────────────────────────────────────────

describe("sendPulseEmail — failure path", () => {
  it("returns send-failed when sendEmail returns success:false", async () => {
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      error: "Resend rejected",
    });
    const result = await sendPulseEmail(HAPPY_LEAD.id, "day0");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("Resend rejected");
    // No stage update on failure
    expect(mockPulseLead.update).not.toHaveBeenCalled();
  });
});

// ─── fireDay0Delivery ─────────────────────────────────────────────────────

describe("fireDay0Delivery", () => {
  it("never throws (swallows + logs internal errors)", async () => {
    mockPulseLead.findUnique.mockRejectedValueOnce(new Error("DB down"));
    // Must NOT throw
    await expect(fireDay0Delivery(HAPPY_LEAD.id)).resolves.toBeUndefined();
  });

  it("dispatches the day-0 stage on happy path", async () => {
    await fireDay0Delivery(HAPPY_LEAD.id);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const args = mockSendEmail.mock.calls[0][0];
    expect(args.metadata).toEqual({ stage: "day0" });
  });
});
