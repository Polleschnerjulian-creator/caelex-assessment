import { describe, it, expect, vi, beforeEach } from "vitest";
import { PRICING_TIERS, PlanType } from "@/lib/stripe/pricing";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/client";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
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
      vi.mocked(prisma.subscription.create).mockResolvedValue({
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
      expect(prisma.subscription.create).toHaveBeenCalled();
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
