import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock next/headers (must be before route import) ───
const mockHeadersGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockHeadersGet(...args),
  }),
}));

// ─── Mock Stripe client ───
const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}));

// ─── Mock subscription service handlers ───
const mockHandleCheckoutComplete = vi.fn();
const mockHandleInvoicePaid = vi.fn();
const mockHandlePaymentFailed = vi.fn();
const mockHandleSubscriptionUpdated = vi.fn();
const mockHandleSubscriptionCanceled = vi.fn();

vi.mock("@/lib/services/subscription-service", () => ({
  handleCheckoutComplete: (...args: unknown[]) =>
    mockHandleCheckoutComplete(...args),
  handleInvoicePaid: (...args: unknown[]) => mockHandleInvoicePaid(...args),
  handlePaymentFailed: (...args: unknown[]) => mockHandlePaymentFailed(...args),
  handleSubscriptionUpdated: (...args: unknown[]) =>
    mockHandleSubscriptionUpdated(...args),
  handleSubscriptionCanceled: (...args: unknown[]) =>
    mockHandleSubscriptionCanceled(...args),
}));

// ─── Mock analytics ───
const mockTrack = vi.fn();
vi.mock("@/lib/analytics", () => ({
  serverAnalytics: {
    track: (...args: unknown[]) => mockTrack(...args),
  },
}));

// ─── Mock logger ───
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "@/app/api/stripe/webhooks/route";
import { NextRequest } from "next/server";

// ─── Helpers ───

function createWebhookRequest(body: string = "{}"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhooks", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createStripeEvent(
  type: string,
  dataObject: Record<string, unknown> = {},
): { id: string; type: string; data: { object: Record<string, unknown> } } {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: {
      object: dataObject,
    },
  };
}

// ─── Tests ───

describe("Stripe Webhook Handler - POST /api/stripe/webhooks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    };
    mockHeadersGet.mockReturnValue(null);
    mockHandleCheckoutComplete.mockResolvedValue(undefined);
    mockHandleInvoicePaid.mockResolvedValue(undefined);
    mockHandlePaymentFailed.mockResolvedValue(undefined);
    mockHandleSubscriptionUpdated.mockResolvedValue(undefined);
    mockHandleSubscriptionCanceled.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Signature & Configuration Validation ───

  describe("signature and configuration validation", () => {
    it("should return 400 when stripe-signature header is missing", async () => {
      mockHeadersGet.mockReturnValue(null);

      const request = createWebhookRequest('{"test": true}');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No stripe-signature header");
    });

    it("should return 500 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_test_123";
        return null;
      });

      const request = createWebhookRequest('{"test": true}');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Webhook secret not configured");
    });

    it("should return 400 when signature verification fails", async () => {
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_invalid";
        return null;
      });
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Signature verification failed");
      });

      const request = createWebhookRequest('{"test": true}');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Webhook signature verification failed");
    });

    it("should call constructEvent with correct arguments", async () => {
      const body = '{"id":"evt_123"}';
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_test_valid";
        return null;
      });
      const event = createStripeEvent("unknown.event");
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(body);
      await POST(request);

      expect(mockConstructEvent).toHaveBeenCalledWith(
        body,
        "sig_test_valid",
        "whsec_test_secret",
      );
    });
  });

  // ─── checkout.session.completed ───

  describe("checkout.session.completed", () => {
    it("should call handleCheckoutComplete with session object", async () => {
      const sessionObject = {
        id: "cs_test_123",
        mode: "subscription",
        subscription: "sub_test_456",
        metadata: { organizationId: "org-1", userId: "user-1" },
        customer: "cus_test_789",
      };
      const event = createStripeEvent(
        "checkout.session.completed",
        sessionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockHandleCheckoutComplete).toHaveBeenCalledTimes(1);
      expect(mockHandleCheckoutComplete).toHaveBeenCalledWith(sessionObject);
    });

    it("should track analytics event for checkout.session.completed", async () => {
      const sessionObject = {
        id: "cs_test_123",
        mode: "subscription",
        subscription: "sub_test_456",
        metadata: { organizationId: "org-1" },
      };
      const event = createStripeEvent(
        "checkout.session.completed",
        sessionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).toHaveBeenCalledWith(
        "stripe_checkout_session_completed",
        {
          stripeEventId: event.id,
          eventType: "checkout.session.completed",
        },
        { category: "conversion" },
      );
    });

    it("should return 200 with error note when handler throws", async () => {
      const event = createStripeEvent("checkout.session.completed", {
        id: "cs_test_fail",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);
      mockHandleCheckoutComplete.mockRejectedValue(
        new Error("Database connection lost"),
      );

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      // Returns 200 to acknowledge receipt and prevent Stripe retries
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.error).toBe("Handler error");
    });
  });

  // ─── customer.subscription.updated ───

  describe("customer.subscription.updated", () => {
    it("should call handleSubscriptionUpdated with subscription object", async () => {
      const subscriptionObject = {
        id: "sub_test_updated",
        status: "active",
        items: {
          data: [{ price: { id: "price_professional_monthly" } }],
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        cancel_at_period_end: false,
      };
      const event = createStripeEvent(
        "customer.subscription.updated",
        subscriptionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockHandleSubscriptionUpdated).toHaveBeenCalledTimes(1);
      expect(mockHandleSubscriptionUpdated).toHaveBeenCalledWith(
        subscriptionObject,
      );
    });

    it("should track analytics for subscription update", async () => {
      const subscriptionObject = {
        id: "sub_test_updated",
        status: "active",
      };
      const event = createStripeEvent(
        "customer.subscription.updated",
        subscriptionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).toHaveBeenCalledWith(
        "stripe_customer_subscription_updated",
        {
          stripeEventId: event.id,
          eventType: "customer.subscription.updated",
        },
        { category: "conversion" },
      );
    });

    it("should return 200 even when subscription update handler fails", async () => {
      const event = createStripeEvent("customer.subscription.updated", {
        id: "sub_fail",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);
      mockHandleSubscriptionUpdated.mockRejectedValue(
        new Error("Subscription not found"),
      );

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.error).toBe("Handler error");
    });
  });

  // ─── customer.subscription.deleted ───

  describe("customer.subscription.deleted", () => {
    it("should call handleSubscriptionCanceled with subscription object", async () => {
      const subscriptionObject = {
        id: "sub_test_deleted",
        status: "canceled",
        items: {
          data: [{ price: { id: "price_starter_monthly" } }],
        },
      };
      const event = createStripeEvent(
        "customer.subscription.deleted",
        subscriptionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockHandleSubscriptionCanceled).toHaveBeenCalledTimes(1);
      expect(mockHandleSubscriptionCanceled).toHaveBeenCalledWith(
        subscriptionObject,
      );
    });

    it("should track analytics for subscription deletion", async () => {
      const subscriptionObject = {
        id: "sub_test_deleted",
        status: "canceled",
      };
      const event = createStripeEvent(
        "customer.subscription.deleted",
        subscriptionObject,
      );

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).toHaveBeenCalledWith(
        "stripe_customer_subscription_deleted",
        {
          stripeEventId: event.id,
          eventType: "customer.subscription.deleted",
        },
        { category: "conversion" },
      );
    });

    it("should return 200 even when cancellation handler fails", async () => {
      const event = createStripeEvent("customer.subscription.deleted", {
        id: "sub_cancel_fail",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);
      mockHandleSubscriptionCanceled.mockRejectedValue(
        new Error("Organization not found"),
      );

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.error).toBe("Handler error");
    });
  });

  // ─── invoice.paid ───

  describe("invoice.paid", () => {
    it("should call handleInvoicePaid with invoice object", async () => {
      const invoiceObject = {
        id: "in_test_paid",
        subscription: "sub_test_123",
        status: "paid",
        amount_paid: 29900,
        currency: "eur",
      };
      const event = createStripeEvent("invoice.paid", invoiceObject);

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockHandleInvoicePaid).toHaveBeenCalledTimes(1);
      expect(mockHandleInvoicePaid).toHaveBeenCalledWith(invoiceObject);
    });

    it("should track analytics for invoice.paid", async () => {
      const invoiceObject = {
        id: "in_test_paid",
        subscription: "sub_test_123",
      };
      const event = createStripeEvent("invoice.paid", invoiceObject);

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).toHaveBeenCalledWith(
        "stripe_invoice_paid",
        {
          stripeEventId: event.id,
          eventType: "invoice.paid",
        },
        { category: "conversion" },
      );
    });
  });

  // ─── invoice.payment_failed ───

  describe("invoice.payment_failed", () => {
    it("should call handlePaymentFailed with invoice object", async () => {
      const invoiceObject = {
        id: "in_test_failed",
        subscription: "sub_test_456",
        status: "open",
        amount_due: 29900,
        currency: "eur",
        attempt_count: 2,
      };
      const event = createStripeEvent("invoice.payment_failed", invoiceObject);

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockHandlePaymentFailed).toHaveBeenCalledTimes(1);
      expect(mockHandlePaymentFailed).toHaveBeenCalledWith(invoiceObject);
    });

    it("should track analytics for payment failure", async () => {
      const invoiceObject = {
        id: "in_test_failed",
        subscription: "sub_test_456",
      };
      const event = createStripeEvent("invoice.payment_failed", invoiceObject);

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).toHaveBeenCalledWith(
        "stripe_invoice_payment_failed",
        {
          stripeEventId: event.id,
          eventType: "invoice.payment_failed",
        },
        { category: "conversion" },
      );
    });

    it("should return 200 even when payment failure handler throws", async () => {
      const event = createStripeEvent("invoice.payment_failed", {
        id: "in_handler_fail",
        subscription: "sub_test_789",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);
      mockHandlePaymentFailed.mockRejectedValue(
        new Error("Email service unavailable"),
      );

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.error).toBe("Handler error");
    });
  });

  // ─── Unhandled Events ───

  describe("unhandled event types", () => {
    it("should return 200 for unrecognized event types", async () => {
      const event = createStripeEvent("payment_intent.created", {
        id: "pi_test_123",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.error).toBeUndefined();
    });

    it("should not call any handler for unrecognized event types", async () => {
      const event = createStripeEvent("charge.succeeded", {
        id: "ch_test_123",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockHandleCheckoutComplete).not.toHaveBeenCalled();
      expect(mockHandleInvoicePaid).not.toHaveBeenCalled();
      expect(mockHandlePaymentFailed).not.toHaveBeenCalled();
      expect(mockHandleSubscriptionUpdated).not.toHaveBeenCalled();
      expect(mockHandleSubscriptionCanceled).not.toHaveBeenCalled();
    });

    it("should not track analytics for unrecognized event types", async () => {
      const event = createStripeEvent("charge.refunded", {
        id: "ch_test_refund",
      });

      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });
      mockConstructEvent.mockReturnValue(event);

      const request = createWebhookRequest(JSON.stringify(event));
      await POST(request);

      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  // ─── End-to-End Flow ───

  describe("end-to-end webhook flow", () => {
    it("should process multiple different events correctly in sequence", async () => {
      mockHeadersGet.mockImplementation((name: string) => {
        if (name === "stripe-signature") return "sig_valid";
        return null;
      });

      // First: checkout completed
      const checkoutEvent = createStripeEvent("checkout.session.completed", {
        id: "cs_123",
        subscription: "sub_new",
      });
      mockConstructEvent.mockReturnValue(checkoutEvent);
      let request = createWebhookRequest(JSON.stringify(checkoutEvent));
      let response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockHandleCheckoutComplete).toHaveBeenCalledTimes(1);

      // Second: subscription updated
      const updateEvent = createStripeEvent("customer.subscription.updated", {
        id: "sub_new",
        status: "active",
      });
      mockConstructEvent.mockReturnValue(updateEvent);
      request = createWebhookRequest(JSON.stringify(updateEvent));
      response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockHandleSubscriptionUpdated).toHaveBeenCalledTimes(1);

      // Third: invoice paid
      const invoiceEvent = createStripeEvent("invoice.paid", {
        id: "in_123",
        subscription: "sub_new",
      });
      mockConstructEvent.mockReturnValue(invoiceEvent);
      request = createWebhookRequest(JSON.stringify(invoiceEvent));
      response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockHandleInvoicePaid).toHaveBeenCalledTimes(1);

      // Analytics tracked for all three
      expect(mockTrack).toHaveBeenCalledTimes(3);
    });
  });
});
