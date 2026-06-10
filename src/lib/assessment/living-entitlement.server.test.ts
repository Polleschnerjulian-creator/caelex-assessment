/**
 * Tests for the living-tier entitlement gate (plan Task 4.3, founder §11.2 —
 * the living tier is PAID).
 *
 * PURE/MOCKED unit tests — Prisma is mocked; the resolution path
 * OrganizationMember → Organization → Subscription and the plan/status
 * decision table are exercised exhaustively:
 *
 *   entitled  ⇔ subscription exists AND plan !== "FREE"
 *               AND status ∈ { ACTIVE, TRIALING }
 *
 * (Not executed here — the orchestrator runs the suite centrally.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const memberFindFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: (args: unknown) => memberFindFirstMock(args),
    },
  },
}));

import { hasLivingTierEntitlement } from "./living-entitlement.server";

function membershipWith(
  subscription: { plan: string; status: string } | null,
): unknown {
  return { organization: { subscription } };
}

beforeEach(() => {
  memberFindFirstMock.mockReset();
});

describe("hasLivingTierEntitlement — resolution path", () => {
  it("resolves through OrganizationMember → Organization → Subscription for the given user", async () => {
    memberFindFirstMock.mockResolvedValue(
      membershipWith({ plan: "PROFESSIONAL", status: "ACTIVE" }),
    );
    await hasLivingTierEntitlement("user_1");

    expect(memberFindFirstMock).toHaveBeenCalledTimes(1);
    const arg = memberFindFirstMock.mock.calls[0][0] as {
      where: { userId: string };
      select: {
        organization: {
          select: {
            subscription: { select: { plan: boolean; status: boolean } };
          };
        };
      };
    };
    expect(arg.where).toEqual({ userId: "user_1" });
    // Field names verified against prisma/schema.prisma: the relation on
    // Organization is lowercase `subscription`, Subscription carries
    // `plan` (OrganizationPlan) + `status` (SubscriptionStatus).
    expect(arg.select.organization.select.subscription.select).toEqual({
      plan: true,
      status: true,
    });
  });
});

describe("hasLivingTierEntitlement — NOT entitled", () => {
  it("returns false when the user has no organization membership", async () => {
    memberFindFirstMock.mockResolvedValue(null);
    await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(false);
  });

  it("returns false when the organization has no Subscription row", async () => {
    memberFindFirstMock.mockResolvedValue(membershipWith(null));
    await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(false);
  });

  it("returns false for plan FREE even with status ACTIVE (the schema default plan)", async () => {
    memberFindFirstMock.mockResolvedValue(
      membershipWith({ plan: "FREE", status: "ACTIVE" }),
    );
    await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(false);
  });

  it("returns false for plan FREE + status TRIALING (the schema defaults)", async () => {
    memberFindFirstMock.mockResolvedValue(
      membershipWith({ plan: "FREE", status: "TRIALING" }),
    );
    await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(false);
  });

  it.each(["CANCELED", "PAST_DUE", "UNPAID", "INCOMPLETE"] as const)(
    "returns false for a paid plan with unusable status %s",
    async (status) => {
      memberFindFirstMock.mockResolvedValue(
        membershipWith({ plan: "PROFESSIONAL", status }),
      );
      await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(false);
    },
  );
});

describe("hasLivingTierEntitlement — entitled (paid plan + usable status)", () => {
  it.each([
    ["STARTER", "ACTIVE"],
    ["STARTER", "TRIALING"],
    ["PROFESSIONAL", "ACTIVE"],
    ["PROFESSIONAL", "TRIALING"],
    ["ENTERPRISE", "ACTIVE"],
    ["ENTERPRISE", "TRIALING"],
  ] as const)("returns true for plan %s + status %s", async (plan, status) => {
    memberFindFirstMock.mockResolvedValue(membershipWith({ plan, status }));
    await expect(hasLivingTierEntitlement("user_1")).resolves.toBe(true);
  });
});
