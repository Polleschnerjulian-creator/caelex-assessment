/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhooks
 *
 * Handles incoming Stripe webhook events.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import { serverAnalytics } from "@/lib/analytics";
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
} from "@/lib/services/subscription-service";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  if (!stripe) {
    logger.error("Stripe is not configured");
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    logger.error("No stripe-signature header");
    return NextResponse.json(
      { error: "No stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await handleInvoicePaid(
          invoice as Parameters<typeof handleInvoicePaid>[0],
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await handlePaymentFailed(
          invoice as Parameters<typeof handlePaymentFailed>[0],
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(
          subscription as Parameters<typeof handleSubscriptionUpdated>[0],
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(
          subscription as Parameters<typeof handleSubscriptionCanceled>[0],
        );
        break;
      }

      default:
        // Ignore other events
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Track payment events for analytics
    if (
      [
        "checkout.session.completed",
        "invoice.paid",
        "invoice.payment_failed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      serverAnalytics.track(
        `stripe_${event.type.replace(/\./g, "_")}`,
        {
          stripeEventId: event.id,
          eventType: event.type,
        },
        { category: "conversion" },
      );
    }
  } catch (error) {
    logger.error(`Error handling webhook event ${event.type}:`, error);
    // Return 200 to acknowledge receipt (prevent retries for non-critical errors)
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}
