import { describe, it, expect, vi, beforeEach } from "vitest";
import { PRICING_TIERS, PlanType } from "@/lib/stripe/pricing";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Stripe
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock LogSnag
vi.mock("@/lib/logsnag", () => ({
  trackSubscription: vi.fn(),
}));

// Mock Email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailConfigured: vi.fn().mockReturnValue(false),
}));

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/client";
import { trackSubscription } from "@/lib/logsnag";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  handleCheckoutComplete,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
  checkFeatureAccess,
  checkLimitUsage,
} from "@/lib/services/subscription-service";

describe("Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("should create checkout session for existing customer", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Test Org",
        billingEmail: "billing@test.com",
        subscription: {
          stripeCustomerId: "cus_existing",
        },
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        mockOrg as never,
      );
      vi.mocked(stripe!.checkout.sessions.create).mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      } as never);

      const result = await createCheckoutSession({
        organizationId: "org-1",
        priceId: "price_starter_monthly",
        userId: "user-1",
        successUrl: "https://app.com/success",
        cancelUrl: "https://app.com/cancel",
      });

      expect(result.sessionId).toBe("cs_test_123");
      expect(result.url).toBe("https://checkout.stripe.com/test");
      expect(stripe!.checkout.sessions.create).toHaveBeenCalled();
    });

    it("should create new customer if none exists", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Test Org",
        billingEmail: "billing@test.com",
        subscription: null,
      };

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        mockOrg as never,
      );
      vi.mocked(stripe!.customers.create).mockResolvedValue({
        id: "cus_new",
      } as never);
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({
        id: "sub-1",
        stripeCustomerId: "cus_new",
      } as never);
      vi.mocked(stripe!.checkout.sessions.create).mockResolvedValue({
        id: "cs_test_456",
        url: "https://checkout.stripe.com/test2",
      } as never);

      const result = await createCheckoutSession({
        organizationId: "org-1",
        priceId: "price_starter_monthly",
        userId: "user-1",
        successUrl: "https://app.com/success",
        cancelUrl: "https://app.com/cancel",
      });

      expect(stripe!.customers.create).toHaveBeenCalled();
      expect(prisma.subscription.upsert).toHaveBeenCalled();
      expect(result.sessionId).toBe("cs_test_456");
    });

    it("should throw error for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );

      await expect(
        createCheckoutSession({
          organizationId: "invalid",
          priceId: "price_starter_monthly",
          userId: "user-1",
          successUrl: "https://app.com/success",
          cancelUrl: "https://app.com/cancel",
        }),
      ).rejects.toThrow("Organization not found");
    });
  });

  describe("createPortalSession", () => {
    it("should create portal session for organization with subscription", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeCustomerId: "cus_123",
      } as never);
      vi.mocked(stripe!.billingPortal.sessions.create).mockResolvedValue({
        url: "https://billing.stripe.com/portal",
      } as never);

      const result = await createPortalSession(
        "org-1",
        "https://app.com/settings",
      );

      expect(result.url).toBe("https://billing.stripe.com/portal");
      expect(stripe!.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://app.com/settings",
      });
    });

    it("should throw error if no subscription found", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        null as never,
      );

      await expect(
        createPortalSession("org-1", "https://app.com/settings"),
      ).rejects.toThrow("No subscription found");
    });
  });

  describe("getSubscription", () => {
    it("should return subscription with organization", async () => {
      const mockSubscription = {
        id: "sub-1",
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        organization: {
          id: "org-1",
          name: "Test Org",
        },
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await getSubscription("org-1");

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        include: { organization: true },
      });
    });

    it("should return null for organization without subscription", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        null as never,
      );

      const result = await getSubscription("org-1");

      expect(result).toBeNull();
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel subscription at period end", async () => {
      const mockSubscription = {
        id: "sub-1",
        organizationId: "org-1",
        stripeSubscriptionId: "sub_stripe_123",
        plan: "PROFESSIONAL",
        organization: { id: "org-1", name: "Test Org" },
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );
      vi.mocked(stripe!.subscriptions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      await cancelSubscription("org-1");

      expect(stripe!.subscriptions.update).toHaveBeenCalledWith(
        "sub_stripe_123",
        { cancel_at_period_end: true },
      );
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: expect.any(Date),
        },
      });
      expect(trackSubscription).toHaveBeenCalledWith({
        organizationId: "org-1",
        organizationName: "Test Org",
        plan: "PROFESSIONAL",
        action: "cancel",
      });
    });

    it("should throw error if no active subscription found", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: "sub-1",
        stripeSubscriptionId: null,
      } as never);

      await expect(cancelSubscription("org-1")).rejects.toThrow(
        "No active subscription found",
      );
    });

    it("should throw error if subscription not found at all", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        null as never,
      );

      await expect(cancelSubscription("org-1")).rejects.toThrow(
        "No active subscription found",
      );
    });
  });

  describe("reactivateSubscription", () => {
    it("should reactivate a canceled subscription", async () => {
      const mockSubscription = {
        id: "sub-1",
        organizationId: "org-1",
        stripeSubscriptionId: "sub_stripe_123",
        plan: "STARTER",
        organization: { id: "org-1", name: "Reactivation Org" },
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );
      vi.mocked(stripe!.subscriptions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      await reactivateSubscription("org-1");

      expect(stripe!.subscriptions.update).toHaveBeenCalledWith(
        "sub_stripe_123",
        { cancel_at_period_end: false },
      );
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });
      expect(trackSubscription).toHaveBeenCalledWith({
        organizationId: "org-1",
        organizationName: "Reactivation Org",
        plan: "STARTER",
        action: "reactivate",
      });
    });

    it("should throw error if no subscription found", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        null as never,
      );

      await expect(reactivateSubscription("org-1")).rejects.toThrow(
        "No subscription found",
      );
    });

    it("should throw error if no stripe subscription id", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: "sub-1",
        stripeSubscriptionId: null,
      } as never);

      await expect(reactivateSubscription("org-1")).rejects.toThrow(
        "No subscription found",
      );
    });
  });

  describe("handleCheckoutComplete", () => {
    it("should update subscription and organization on checkout complete", async () => {
      const mockSession = {
        metadata: { organizationId: "org-1" },
        subscription: "sub_stripe_456",
      } as any;

      const mockStripeSub = {
        id: "sub_stripe_456",
        status: "active",
        items: {
          data: [{ price: { id: "price_starter_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_start: null,
        trial_end: null,
      };

      vi.mocked(stripe!.subscriptions.retrieve).mockResolvedValue(
        mockStripeSub as never,
      );
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);

      await handleCheckoutComplete(mockSession);

      expect(stripe!.subscriptions.retrieve).toHaveBeenCalledWith(
        "sub_stripe_456",
      );
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: expect.objectContaining({
          stripeSubscriptionId: "sub_stripe_456",
          stripePriceId: "price_starter_monthly",
          status: "ACTIVE",
          plan: "STARTER",
        }),
      });
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: expect.objectContaining({
          plan: "STARTER",
        }),
      });
      expect(trackSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          plan: "STARTER",
          action: "upgrade",
        }),
      );
    });

    it("should set status to TRIALING when stripe sub is trialing", async () => {
      const mockSession = {
        metadata: { organizationId: "org-1" },
        subscription: "sub_stripe_trial",
      } as any;

      const mockStripeSub = {
        id: "sub_stripe_trial",
        status: "trialing",
        items: {
          data: [{ price: { id: "price_professional_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_start: 1700000000,
        trial_end: 1701209600,
      };

      vi.mocked(stripe!.subscriptions.retrieve).mockResolvedValue(
        mockStripeSub as never,
      );
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);

      await handleCheckoutComplete(mockSession);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: expect.objectContaining({
          status: "TRIALING",
          plan: "PROFESSIONAL",
          trialStart: expect.any(Date),
          trialEnd: expect.any(Date),
        }),
      });
    });

    it("should return early if no organizationId in metadata", async () => {
      const mockSession = {
        metadata: {},
        subscription: "sub_stripe_789",
      } as any;

      await handleCheckoutComplete(mockSession);

      expect(stripe!.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("should return FREE plan for unknown priceId", async () => {
      const mockSession = {
        metadata: { organizationId: "org-1" },
        subscription: "sub_stripe_unknown",
      } as any;

      const mockStripeSub = {
        id: "sub_stripe_unknown",
        status: "active",
        items: {
          data: [{ price: { id: "price_unknown_xyz" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_start: null,
        trial_end: null,
      };

      vi.mocked(stripe!.subscriptions.retrieve).mockResolvedValue(
        mockStripeSub as never,
      );
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as never);

      await handleCheckoutComplete(mockSession);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        data: expect.objectContaining({
          plan: "FREE",
        }),
      });
    });

    it("should not track if org not found after update", async () => {
      const mockSession = {
        metadata: { organizationId: "org-1" },
        subscription: "sub_stripe_no_org",
      } as any;

      const mockStripeSub = {
        id: "sub_stripe_no_org",
        status: "active",
        items: {
          data: [{ price: { id: "price_starter_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_start: null,
        trial_end: null,
      };

      vi.mocked(stripe!.subscriptions.retrieve).mockResolvedValue(
        mockStripeSub as never,
      );
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );

      await handleCheckoutComplete(mockSession);

      expect(trackSubscription).not.toHaveBeenCalled();
    });
  });

  describe("handleInvoicePaid", () => {
    it("should update PAST_DUE subscription to ACTIVE", async () => {
      const mockInvoice = {
        id: "inv_123",
        subscription: "sub_stripe_past_due",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        status: "PAST_DUE",
        organizationId: "org-1",
        stripeSubscriptionId: "sub_stripe_past_due",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      await handleInvoicePaid(mockInvoice);

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_stripe_past_due" },
      });
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { status: "ACTIVE" },
      });
    });

    it("should not update subscription that is already ACTIVE", async () => {
      const mockInvoice = {
        id: "inv_124",
        subscription: "sub_stripe_active",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-2",
        status: "ACTIVE",
        organizationId: "org-1",
        stripeSubscriptionId: "sub_stripe_active",
      } as never);

      await handleInvoicePaid(mockInvoice);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("should return early if no subscription id on invoice", async () => {
      const mockInvoice = {
        id: "inv_125",
        subscription: null,
      };

      await handleInvoicePaid(mockInvoice);

      expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    });

    it("should return early if subscription not found in DB", async () => {
      const mockInvoice = {
        id: "inv_126",
        subscription: "sub_stripe_not_found",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);

      await handleInvoicePaid(mockInvoice);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe("handlePaymentFailed", () => {
    it("should update subscription to PAST_DUE", async () => {
      const mockInvoice = {
        id: "inv_fail_1",
        subscription: "sub_stripe_fail",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-1",
        organizationId: "org-1",
        stripeSubscriptionId: "sub_stripe_fail",
        status: "ACTIVE",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      await handlePaymentFailed(mockInvoice);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { status: "PAST_DUE" },
      });
    });

    it("should return early if no subscription id on invoice", async () => {
      const mockInvoice = {
        id: "inv_fail_2",
        subscription: null,
      };

      await handlePaymentFailed(mockInvoice);

      expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    });

    it("should return early if subscription not found in DB", async () => {
      const mockInvoice = {
        id: "inv_fail_3",
        subscription: "sub_not_found",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);

      await handlePaymentFailed(mockInvoice);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("should send emails to org admins when email is configured", async () => {
      const mockInvoice = {
        id: "inv_fail_email",
        subscription: "sub_stripe_email",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-email",
        organizationId: "org-email",
        stripeSubscriptionId: "sub_stripe_email",
        status: "ACTIVE",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      vi.mocked(isEmailConfigured).mockReturnValue(true);

      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        {
          id: "member-1",
          role: "OWNER",
          user: { email: "owner@test.com", name: "Owner User" },
        },
        {
          id: "member-2",
          role: "ADMIN",
          user: { email: "admin@test.com", name: "Admin User" },
        },
      ] as never);

      await handlePaymentFailed(mockInvoice);

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-email",
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { user: { select: { email: true, name: true } } },
      });

      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "owner@test.com",
          subject: "Payment Failed – Action Required",
        }),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@test.com",
          subject: "Payment Failed – Action Required",
        }),
      );
    });

    it("should skip members without email", async () => {
      const mockInvoice = {
        id: "inv_fail_no_email",
        subscription: "sub_stripe_no_email",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-no-email",
        organizationId: "org-no-email",
        stripeSubscriptionId: "sub_stripe_no_email",
        status: "ACTIVE",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      vi.mocked(isEmailConfigured).mockReturnValue(true);

      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        {
          id: "member-no-email",
          role: "OWNER",
          user: { email: null, name: "No Email User" },
        },
      ] as never);

      await handlePaymentFailed(mockInvoice);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send emails when email is not configured", async () => {
      const mockInvoice = {
        id: "inv_fail_no_cfg",
        subscription: "sub_stripe_no_cfg",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-no-cfg",
        organizationId: "org-no-cfg",
        stripeSubscriptionId: "sub_stripe_no_cfg",
        status: "ACTIVE",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      vi.mocked(isEmailConfigured).mockReturnValue(false);

      await handlePaymentFailed(mockInvoice);

      expect(prisma.organizationMember.findMany).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should handle email sending errors gracefully", async () => {
      const mockInvoice = {
        id: "inv_fail_err",
        subscription: "sub_stripe_err",
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-err",
        organizationId: "org-err",
        stripeSubscriptionId: "sub_stripe_err",
        status: "ACTIVE",
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);

      vi.mocked(isEmailConfigured).mockReturnValue(true);

      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        {
          id: "member-err",
          role: "ADMIN",
          user: { email: "admin@err.com", name: "Admin" },
        },
      ] as never);

      vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP error"));

      // Should not throw
      await handlePaymentFailed(mockInvoice);

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe("handleSubscriptionUpdated", () => {
    it("should update subscription and organization limits", async () => {
      const mockStripeSub = {
        id: "sub_stripe_update",
        status: "active",
        items: {
          data: [{ price: { id: "price_professional_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-upd",
        organizationId: "org-upd",
        stripeSubscriptionId: "sub_stripe_update",
        plan: "PROFESSIONAL",
        organization: { id: "org-upd", name: "Update Org" },
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

      await handleSubscriptionUpdated(mockStripeSub);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-upd" },
        data: expect.objectContaining({
          stripePriceId: "price_professional_monthly",
          status: "ACTIVE",
          plan: "PROFESSIONAL",
          cancelAtPeriodEnd: false,
        }),
      });
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-upd" },
        data: expect.objectContaining({
          plan: "PROFESSIONAL",
        }),
      });
    });

    it("should track plan change on upgrade", async () => {
      const mockStripeSub = {
        id: "sub_stripe_upgrade",
        status: "active",
        items: {
          data: [{ price: { id: "price_professional_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-track",
        organizationId: "org-track",
        stripeSubscriptionId: "sub_stripe_upgrade",
        plan: "STARTER", // Old plan
        organization: { id: "org-track", name: "Track Org" },
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

      await handleSubscriptionUpdated(mockStripeSub);

      expect(trackSubscription).toHaveBeenCalledWith({
        organizationId: "org-track",
        organizationName: "Track Org",
        plan: "PROFESSIONAL",
        action: "upgrade",
        mrr: 799,
      });
    });

    it("should track plan change on downgrade", async () => {
      const mockStripeSub = {
        id: "sub_stripe_downgrade",
        status: "active",
        items: {
          data: [{ price: { id: "price_starter_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-down",
        organizationId: "org-down",
        stripeSubscriptionId: "sub_stripe_downgrade",
        plan: "PROFESSIONAL", // Old plan is higher
        organization: { id: "org-down", name: "Downgrade Org" },
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

      await handleSubscriptionUpdated(mockStripeSub);

      expect(trackSubscription).toHaveBeenCalledWith({
        organizationId: "org-down",
        organizationName: "Downgrade Org",
        plan: "STARTER",
        action: "downgrade",
        mrr: 299,
      });
    });

    it("should not track when plan stays the same", async () => {
      const mockStripeSub = {
        id: "sub_stripe_same",
        status: "active",
        items: {
          data: [{ price: { id: "price_starter_monthly" } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-same",
        organizationId: "org-same",
        stripeSubscriptionId: "sub_stripe_same",
        plan: "STARTER", // Same plan
        organization: { id: "org-same", name: "Same Org" },
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

      await handleSubscriptionUpdated(mockStripeSub);

      expect(trackSubscription).not.toHaveBeenCalled();
    });

    it("should return early if subscription not found", async () => {
      const mockStripeSub = {
        id: "sub_not_found",
        status: "active",
        items: { data: [] },
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);

      await handleSubscriptionUpdated(mockStripeSub);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it("should map various stripe statuses correctly", async () => {
      const statuses: Record<string, string> = {
        active: "ACTIVE",
        trialing: "TRIALING",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "UNPAID",
        incomplete: "INCOMPLETE",
        incomplete_expired: "CANCELED",
        paused: "CANCELED",
      };

      for (const [stripeStatus, expectedStatus] of Object.entries(statuses)) {
        vi.clearAllMocks();

        const mockStripeSub = {
          id: "sub_stripe_status",
          status: stripeStatus,
          items: {
            data: [{ price: { id: "price_starter_monthly" } }],
          },
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
        };

        vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
          id: "sub-status",
          organizationId: "org-status",
          stripeSubscriptionId: "sub_stripe_status",
          plan: "STARTER",
          organization: { id: "org-status", name: "Status Org" },
        } as never);
        vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
        vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

        await handleSubscriptionUpdated(mockStripeSub);

        expect(prisma.subscription.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: expectedStatus,
            }),
          }),
        );
      }
    });
  });

  describe("handleSubscriptionCanceled", () => {
    it("should downgrade to FREE plan", async () => {
      const mockStripeSub = {
        id: "sub_stripe_canceled",
        status: "canceled",
        items: { data: [] },
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
        id: "sub-cancel",
        organizationId: "org-cancel",
        stripeSubscriptionId: "sub_stripe_canceled",
        plan: "PROFESSIONAL",
        organization: { id: "org-cancel", name: "Cancel Org" },
      } as never);
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as never);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

      await handleSubscriptionCanceled(mockStripeSub);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-cancel" },
        data: {
          status: "CANCELED",
          plan: "FREE",
          canceledAt: expect.any(Date),
        },
      });

      const freeFeatures = PRICING_TIERS.FREE.features;
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-cancel" },
        data: {
          plan: "FREE",
          maxUsers:
            typeof freeFeatures.users === "number" ? freeFeatures.users : 1,
          maxSpacecraft:
            typeof freeFeatures.spacecraft === "number"
              ? freeFeatures.spacecraft
              : 1,
        },
      });

      expect(trackSubscription).toHaveBeenCalledWith({
        organizationId: "org-cancel",
        organizationName: "Cancel Org",
        plan: "FREE",
        action: "cancel",
      });
    });

    it("should return early if subscription not found", async () => {
      const mockStripeSub = {
        id: "sub_not_found",
        status: "canceled",
        items: { data: [] },
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);

      await handleSubscriptionCanceled(mockStripeSub);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.organization.update).not.toHaveBeenCalled();
      expect(trackSubscription).not.toHaveBeenCalled();
    });
  });

  describe("checkFeatureAccess", () => {
    it("should allow API access for PROFESSIONAL plan", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "PROFESSIONAL",
        organization: { id: "org-1" },
      } as never);

      const result = await checkFeatureAccess("org-1", "api_access");

      expect(result.allowed).toBe(true);
    });

    it("should deny API access for FREE plan", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "FREE",
        organization: { id: "org-1" },
      } as never);

      const result = await checkFeatureAccess("org-1", "api_access");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.upgradeRequired).toBe("PROFESSIONAL");
    });

    it("should allow SSO for ENTERPRISE plan", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "ENTERPRISE",
        organization: { id: "org-1" },
      } as never);

      const result = await checkFeatureAccess("org-1", "sso");

      expect(result.allowed).toBe(true);
    });

    it("should deny SSO for non-enterprise plans", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "PROFESSIONAL",
        organization: { id: "org-1" },
      } as never);

      const result = await checkFeatureAccess("org-1", "sso");

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe("ENTERPRISE");
    });

    it("should allow module access based on plan", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "STARTER",
        organization: { id: "org-1" },
      } as never);

      const result = await checkFeatureAccess("org-1", "module_authorization");

      expect(result.allowed).toBe(true);
    });

    it("should default to FREE plan when no subscription exists", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
        null as never,
      );

      const result = await checkFeatureAccess("org-1", "api_access");

      expect(result.allowed).toBe(false);
    });
  });

  describe("checkLimitUsage", () => {
    it("should return correct usage for users", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        members: [{ id: "m1" }, { id: "m2" }],
        spacecraft: [],
        subscription: { plan: "STARTER" },
      } as never);

      const result = await checkLimitUsage("org-1", "users");

      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.exceeded).toBe(false);
      expect(result.percentage).toBeLessThan(100);
    });

    it("should return correct usage for spacecraft", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        members: [],
        spacecraft: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
        subscription: { plan: "FREE" },
      } as never);

      const result = await checkLimitUsage("org-1", "spacecraft");

      expect(result.current).toBe(3);
      expect(result.limit).toBe(1);
      expect(result.exceeded).toBe(true);
    });

    it("should return unlimited for enterprise plan", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        members: Array(100).fill({ id: "m" }),
        spacecraft: [],
        subscription: { plan: "ENTERPRISE" },
      } as never);

      const result = await checkLimitUsage("org-1", "users");

      expect(result.limit).toBe("unlimited");
      expect(result.exceeded).toBe(false);
      expect(result.percentage).toBe(0);
    });

    it("should throw error for non-existent organization", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(
        null as never,
      );

      await expect(checkLimitUsage("invalid", "users")).rejects.toThrow(
        "Organization not found",
      );
    });
  });
});
