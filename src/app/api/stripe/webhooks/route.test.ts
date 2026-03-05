/**
 * Stripe Webhook Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
  },
}));

const mockHandleCheckoutComplete = vi.fn();
const mockHandleInvoicePaid = vi.fn();
const mockHandlePaymentFailed = vi.fn();
const mockHandleSubscriptionUpdated = vi.fn();
const mockHandleSubscriptionCanceled = vi.fn();
vi.mock("@/lib/services/subscription-service", () => ({
  handleCheckoutComplete: (...a: unknown[]) => mockHandleCheckoutComplete(...a),
  handleInvoicePaid: (...a: unknown[]) => mockHandleInvoicePaid(...a),
  handlePaymentFailed: (...a: unknown[]) => mockHandlePaymentFailed(...a),
  handleSubscriptionUpdated: (...a: unknown[]) =>
    mockHandleSubscriptionUpdated(...a),
  handleSubscriptionCanceled: (...a: unknown[]) =>
    mockHandleSubscriptionCanceled(...a),
}));

vi.mock("@/lib/analytics", () => ({
  serverAnalytics: { track: vi.fn() },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key: string) => {
      if (key === "stripe-signature") return "sig_test_123";
      return null;
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";
import { stripe } from "@/lib/stripe/client";

const mockStripe = stripe as unknown as {
  webhooks: { constructEvent: ReturnType<typeof vi.fn> };
};

function makeWebhookReq(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) headers["stripe-signature"] = signature;
  return new NextRequest("https://app.caelex.com/api/stripe/webhooks", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/stripe/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReset();
    mockHandleCheckoutComplete.mockReset();
    mockHandleInvoicePaid.mockReset();
    mockHandlePaymentFailed.mockReset();
    mockHandleSubscriptionUpdated.mockReset();
    mockHandleSubscriptionCanceled.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("returns 400 when stripe-signature is missing", async () => {
    // Override headers mock to return null for stripe-signature
    const { headers } = await import("next/headers");
    (headers as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(null),
    });
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(500);
  });

  it("returns 400 when signature verification fails", async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("signature verification failed");
  });

  it("handles checkout.session.completed", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_1",
      data: { object: { id: "cs_1" } },
    });
    mockHandleCheckoutComplete.mockResolvedValue(undefined);
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect(mockHandleCheckoutComplete).toHaveBeenCalled();
  });

  it("handles invoice.paid", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      id: "evt_2",
      data: { object: { id: "in_1" } },
    });
    mockHandleInvoicePaid.mockResolvedValue(undefined);
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect(mockHandleInvoicePaid).toHaveBeenCalled();
  });

  it("handles invoice.payment_failed", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      id: "evt_3",
      data: { object: { id: "in_2" } },
    });
    mockHandlePaymentFailed.mockResolvedValue(undefined);
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect(mockHandlePaymentFailed).toHaveBeenCalled();
  });

  it("handles customer.subscription.updated", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      id: "evt_4",
      data: { object: { id: "sub_1" } },
    });
    mockHandleSubscriptionUpdated.mockResolvedValue(undefined);
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect(mockHandleSubscriptionUpdated).toHaveBeenCalled();
  });

  it("handles customer.subscription.deleted", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      id: "evt_5",
      data: { object: { id: "sub_2" } },
    });
    mockHandleSubscriptionCanceled.mockResolvedValue(undefined);
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect(mockHandleSubscriptionCanceled).toHaveBeenCalled();
  });

  it("returns 200 for unknown event types (acknowledge but ignore)", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "unknown.event.type",
      id: "evt_6",
      data: { object: {} },
    });
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it("returns 200 even when handler throws (prevents retries)", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_7",
      data: { object: { id: "cs_2" } },
    });
    mockHandleCheckoutComplete.mockRejectedValue(new Error("DB crash"));
    const res = await POST(makeWebhookReq("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.error).toBe("Handler error");
  });
});
