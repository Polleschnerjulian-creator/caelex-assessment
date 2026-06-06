import "server-only";
import { prisma } from "@/lib/prisma";
import type { ProductCode } from "@prisma/client";

/**
 * Multi-Product Access (Sprint T1) — read/write API for the
 * `OrganizationProductAccess` ledger.
 *
 * Each row represents one (Organization, Product) grant with a status
 * and source. Use this module to gate cross-product access in layouts,
 * server actions, and route handlers instead of the legacy orgType /
 * Subscription.plan checks. T1 itself does not switch the existing
 * gates; the new Trade route group (Sprint T2) is the first consumer.
 */

/**
 * Check whether an Organization currently has access to a product.
 * Returns false for missing rows, SUSPENDED, EXPIRED, or rows past
 * their `expiresAt`. ACTIVE and unexpired TRIAL both grant access.
 */
export async function hasProductAccess(
  organizationId: string,
  product: ProductCode,
): Promise<boolean> {
  const access = await prisma.organizationProductAccess.findUnique({
    where: { organizationId_product: { organizationId, product } },
    select: { status: true, expiresAt: true },
  });

  if (!access) return false;
  if (access.status === "SUSPENDED" || access.status === "EXPIRED")
    return false;
  if (access.expiresAt && access.expiresAt < new Date()) return false;
  return true;
}

/**
 * List every product an Organization currently has access to.
 * Returns ACTIVE rows + non-expired TRIAL rows.
 */
export async function getActiveProducts(
  organizationId: string,
): Promise<ProductCode[]> {
  const accesses = await prisma.organizationProductAccess.findMany({
    where: {
      organizationId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    select: { product: true, expiresAt: true },
  });

  const now = new Date();
  return accesses
    .filter((a) => !a.expiresAt || a.expiresAt > now)
    .map((a) => a.product);
}

/**
 * Grant a product to an Organization. Used by the admin API for
 * enterprise sales grants and by trial-promo flows (e.g. the 6-month
 * Trade Starter bonus for ex-Comply Export Control users).
 *
 * Upserts — re-activates a SUSPENDED row by clearing suspendedAt /
 * suspendedReason. STRIPE-sourced grants are written by the Stripe
 * webhook handler (subscription-service.ts), not via this helper.
 */
export async function grantProductAccess(input: {
  organizationId: string;
  product: ProductCode;
  source: "MANUAL" | "TRIAL_PROMO" | "INSTITUTIONAL";
  status?: "ACTIVE" | "TRIAL";
  expiresAt?: Date | null;
  grantedById?: string;
  notes?: string;
  seatCap?: number | null;
}) {
  const status = input.status ?? "ACTIVE";
  const seatCap = input.seatCap ?? null;
  return prisma.organizationProductAccess.upsert({
    where: {
      organizationId_product: {
        organizationId: input.organizationId,
        product: input.product,
      },
    },
    create: {
      organizationId: input.organizationId,
      product: input.product,
      status,
      source: input.source,
      expiresAt: input.expiresAt ?? null,
      grantedById: input.grantedById ?? null,
      notes: input.notes ?? null,
      seatCap,
    },
    update: {
      status,
      suspendedAt: null,
      suspendedReason: null,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? null,
      seatCap,
    },
  });
}

/**
 * Soft-revoke a product access — sets status=SUSPENDED while keeping
 * the row for audit. Used by Stripe-cancel paths and admin block.
 * A no-op when no row exists for the (org, product) tuple.
 */
export async function revokeProductAccess(
  organizationId: string,
  product: ProductCode,
  reason: string,
) {
  return prisma.organizationProductAccess.updateMany({
    where: { organizationId, product },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspendedReason: reason,
    },
  });
}
