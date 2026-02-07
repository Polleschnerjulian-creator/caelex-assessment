/**
 * Webhooks Management
 * GET - List webhooks for organization
 * POST - Create new webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationWebhooks,
  createWebhook,
  WEBHOOK_EVENTS,
} from "@/lib/services/webhook-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user is a member of the organization
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
    });
    if (!member) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 },
      );
    }

    const webhooks = await getOrganizationWebhooks(organizationId);

    // Don't expose secrets in list view
    const sanitizedWebhooks = webhooks.map((wh) => ({
      ...wh,
      secret: undefined,
      secretPrefix: wh.secret.slice(0, 12) + "...",
    }));

    return NextResponse.json({
      webhooks: sanitizedWebhooks,
      availableEvents: Object.entries(WEBHOOK_EVENTS).map(
        ([event, description]) => ({
          event,
          description,
        }),
      ),
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, name, url, events, headers } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user is a member of the organization
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
    });
    if (!member) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 },
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Must be HTTPS in production
    if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Webhook URL must use HTTPS" },
        { status: 400 },
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "At least one event is required" },
        { status: 400 },
      );
    }

    // Validate events
    const validEvents = Object.keys(WEBHOOK_EVENTS);
    const invalidEvents = events.filter(
      (e: string) => !validEvents.includes(e) && e !== "*",
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(", ")}` },
        { status: 400 },
      );
    }

    const webhook = await createWebhook({
      organizationId,
      name,
      url,
      events,
      headers,
    });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
      // Return secret only on creation
      secret: webhook.secret,
      warning:
        "Store this secret securely. You will need it to verify webhook signatures.",
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
