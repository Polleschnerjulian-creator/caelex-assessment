/**
 * Subscription Service
 *
 * Handles Stripe subscription management and feature gating.
 */

import { stripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/prisma";
import { PRICING_TIERS, PlanType, hasModuleAccess } from "@/lib/stripe/pricing";
import { trackSubscription } from "@/lib/logsnag";
import type StripeTypes from "stripe";

// ─── Internal Stripe Types ───
// Minimal types to avoid conflicts with Prisma models

interface StripeSubscriptionData {
  id: string;
  status: string;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  current_period_start?: number;
  current_period_end?: number;
  trial_start?: number;
  trial_end?: number;
  cancel_at_period_end?: boolean;
}

interface StripeInvoiceData {
  id: string;
  subscription?: string | null;
}

// ─── Types ───

export interface CreateCheckoutSessionParams {
  organizationId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: PlanType;
}

// ─── Subscription Management ───

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const { organizationId, priceId, userId, successUrl, cancelUrl } = params;

  // Get organization
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Get or create Stripe customer
  let stripeCustomerId = organization.subscription?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: {
        organizationId,
        userId,
      },
      email: organization.billingEmail || undefined,
      name: organization.name,
    });
    stripeCustomerId = customer.id;

    // Create subscription record
    await prisma.subscription.create({
      data: {
        organizationId,
        stripeCustomerId,
        status: "INCOMPLETE",
        plan: "FREE",
      },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      userId,
    },
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        organizationId,
      },
    },
    billing_address_collection: "required",
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Create a Stripe Customer Portal Session
 */
export async function createPortalSession(
  organizationId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No subscription found for this organization");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Get current subscription for organization
 */
export async function getSubscription(organizationId: string) {
  return prisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: true },
  });
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  organizationId: string,
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: true },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  // Cancel in Stripe
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update local record
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  // Track event
  await trackSubscription({
    organizationId,
    organizationName: subscription.organization.name,
    plan: subscription.plan,
    action: "cancel",
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  organizationId: string,
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: true },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error("No subscription found");
  }

  // Reactivate in Stripe
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Update local record
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  // Track event
  await trackSubscription({
    organizationId,
    organizationName: subscription.organization.name,
    plan: subscription.plan,
    action: "reactivate",
  });
}

// ─── Webhook Handlers ───

/**
 * Handle checkout.session.completed event
 */
export async function handleCheckoutComplete(
  session: StripeTypes.Checkout.Session,
): Promise<void> {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error("No organizationId in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;

  // Get subscription details from Stripe
  if (!stripe) return;
  const stripeSub = (await stripe.subscriptions.retrieve(
    subscriptionId,
  )) as unknown as StripeSubscriptionData;
  if (!stripeSub) return;

  // Determine plan from price
  const priceId = stripeSub.items?.data?.[0]?.price?.id;
  const plan = getPlanFromPriceId(priceId);

  // Update subscription record
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: stripeSub.status === "trialing" ? "TRIALING" : "ACTIVE",
      plan,
      currentPeriodStart: stripeSub.current_period_start
        ? new Date(stripeSub.current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
      trialStart: stripeSub.trial_start
        ? new Date(stripeSub.trial_start * 1000)
        : null,
      trialEnd: stripeSub.trial_end
        ? new Date(stripeSub.trial_end * 1000)
        : null,
    },
  });

  // Update organization plan and limits
  const planFeatures = PRICING_TIERS[plan].features;
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan,
      maxUsers:
        typeof planFeatures.users === "number" ? planFeatures.users : 999,
      maxSpacecraft:
        typeof planFeatures.spacecraft === "number"
          ? planFeatures.spacecraft
          : 999,
    },
  });

  // Get org for tracking
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (org) {
    await trackSubscription({
      organizationId,
      organizationName: org.name,
      plan,
      action: "upgrade",
      mrr: PRICING_TIERS[plan].price || 0,
    });
  }
}

/**
 * Handle invoice.paid event
 */
export async function handleInvoicePaid(
  invoice: StripeInvoiceData,
): Promise<void> {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Find subscription by Stripe ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  // Update status to active if it was past_due
  if (subscription.status === "PAST_DUE") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE" },
    });
  }
}

/**
 * Handle invoice.payment_failed event
 */
export async function handlePaymentFailed(
  invoice: StripeInvoiceData,
): Promise<void> {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Find subscription by Stripe ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  // Update status to past_due
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  // TODO: Send notification email about failed payment
}

/**
 * Handle customer.subscription.updated event
 */
export async function handleSubscriptionUpdated(
  stripeSubscription: StripeSubscriptionData,
): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id },
    include: { organization: true },
  });

  if (!subscription) return;

  const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
  const newPlan = getPlanFromPriceId(priceId);
  const oldPlan = subscription.plan;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    paused: "CANCELED",
  };

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      stripePriceId: priceId,
      status: (statusMap[stripeSubscription.status] || "ACTIVE") as
        | "TRIALING"
        | "ACTIVE"
        | "PAST_DUE"
        | "CANCELED"
        | "UNPAID"
        | "INCOMPLETE",
      plan: newPlan,
      currentPeriodStart: stripeSubscription.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
    },
  });

  // Update organization limits
  const planFeatures = PRICING_TIERS[newPlan].features;
  await prisma.organization.update({
    where: { id: subscription.organizationId },
    data: {
      plan: newPlan,
      maxUsers:
        typeof planFeatures.users === "number" ? planFeatures.users : 999,
      maxSpacecraft:
        typeof planFeatures.spacecraft === "number"
          ? planFeatures.spacecraft
          : 999,
    },
  });

  // Track plan change
  if (oldPlan !== newPlan) {
    const action =
      getPlanLevel(newPlan) > getPlanLevel(oldPlan) ? "upgrade" : "downgrade";
    await trackSubscription({
      organizationId: subscription.organizationId,
      organizationName: subscription.organization.name,
      plan: newPlan,
      action,
      mrr: PRICING_TIERS[newPlan].price || 0,
    });
  }
}

/**
 * Handle customer.subscription.deleted event
 */
export async function handleSubscriptionCanceled(
  stripeSubscription: StripeSubscriptionData,
): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id },
    include: { organization: true },
  });

  if (!subscription) return;

  // Downgrade to free plan
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "CANCELED",
      plan: "FREE",
      canceledAt: new Date(),
    },
  });

  // Update organization to free limits
  const freeFeatures = PRICING_TIERS.FREE.features;
  await prisma.organization.update({
    where: { id: subscription.organizationId },
    data: {
      plan: "FREE",
      maxUsers: typeof freeFeatures.users === "number" ? freeFeatures.users : 1,
      maxSpacecraft:
        typeof freeFeatures.spacecraft === "number"
          ? freeFeatures.spacecraft
          : 1,
    },
  });

  // Track cancellation
  await trackSubscription({
    organizationId: subscription.organizationId,
    organizationName: subscription.organization.name,
    plan: "FREE",
    action: "cancel",
  });
}

// ─── Feature Gating ───

/**
 * Check if organization has access to a feature
 */
export async function checkFeatureAccess(
  organizationId: string,
  feature: string,
): Promise<FeatureAccessResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { organization: true },
  });

  const plan = (subscription?.plan || "FREE") as PlanType;
  const features = PRICING_TIERS[plan].features;

  // Check specific features
  switch (feature) {
    case "api_access":
      if (!features.api) {
        return {
          allowed: false,
          reason: "API access requires Professional plan or higher",
          upgradeRequired: "PROFESSIONAL",
        };
      }
      return { allowed: true };

    case "sso":
      if (!features.sso) {
        return {
          allowed: false,
          reason: "SSO requires Enterprise plan",
          upgradeRequired: "ENTERPRISE",
        };
      }
      return { allowed: true };

    default:
      // Check module access
      if (feature.startsWith("module_")) {
        const moduleName = feature.replace("module_", "");
        if (!hasModuleAccess(plan, moduleName)) {
          return {
            allowed: false,
            reason: `Access to ${moduleName} module requires upgrade`,
            upgradeRequired: "STARTER",
          };
        }
        return { allowed: true };
      }

      return { allowed: true };
  }
}

/**
 * Check if organization has exceeded a limit
 */
export async function checkLimitUsage(
  organizationId: string,
  resource: "users" | "spacecraft" | "storage",
): Promise<{
  current: number;
  limit: number | "unlimited";
  exceeded: boolean;
  percentage: number;
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: true,
      spacecraft: true,
      subscription: true,
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const plan = (organization.subscription?.plan || "FREE") as PlanType;
  const features = PRICING_TIERS[plan].features;

  let current = 0;
  let limit = features[resource];

  switch (resource) {
    case "users":
      current = organization.members.length;
      break;
    case "spacecraft":
      current = organization.spacecraft.length;
      break;
    case "storage":
      // TODO: Calculate actual storage usage
      current = 0;
      break;
  }

  const exceeded = limit !== "unlimited" && current >= limit;
  const percentage = limit === "unlimited" ? 0 : (current / limit) * 100;

  return {
    current,
    limit,
    exceeded,
    percentage: Math.min(percentage, 100),
  };
}

// ─── Helpers ───

function getPlanFromPriceId(priceId: string | undefined): PlanType {
  if (!priceId) return "FREE";
  for (const [plan, config] of Object.entries(PRICING_TIERS)) {
    if (config.priceId === priceId || config.yearlyPriceId === priceId) {
      return plan as PlanType;
    }
  }
  return "FREE";
}

function getPlanLevel(plan: PlanType): number {
  const levels: Record<PlanType, number> = {
    FREE: 0,
    STARTER: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  };
  return levels[plan];
}
