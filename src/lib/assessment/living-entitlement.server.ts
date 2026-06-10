/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Living-tier entitlement gate (plan Task 4.3 — founder decision §11.2:
 * the living tier is PAID; quick is free, full is behind a free account).
 *
 * There is no per-feature flag for the living tier in `getPlanLimits()` yet,
 * so the gate sits directly on the REAL billing record. Resolution path is
 * the existing billing spine (verified against prisma/schema.prisma):
 *
 *   OrganizationMember (userId) → Organization → Subscription (1:1 optional;
 *   `Subscription.plan` is `OrganizationPlan` and defaults FREE,
 *   `Subscription.status` is `SubscriptionStatus` and defaults TRIALING).
 *
 * Entitled ⇔ a subscription row exists AND plan !== "FREE" AND status is a
 * usable one ("ACTIVE" | "TRIALING"). Everything else — no membership, no
 * subscription row, FREE plan, CANCELED / PAST_DUE / UNPAID / INCOMPLETE —
 * is NOT entitled. Callers (the reassess route, the Task 4.4 re-run CTA)
 * must check this BEFORE any profile load or pipeline work.
 */

import "server-only";

import { prisma } from "@/lib/prisma";

/** Founder §11.2: living tier is paid. Resolution path is the existing billing
 *  spine: OrganizationMember → Organization → Subscription (1:1, plan defaults FREE). */
export async function hasLivingTierEntitlement(
  userId: string,
): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organization: {
        select: { subscription: { select: { plan: true, status: true } } },
      },
    },
  });
  const sub = membership?.organization.subscription;
  return (
    !!sub &&
    sub.plan !== "FREE" &&
    (sub.status === "ACTIVE" || sub.status === "TRIALING")
  );
}
