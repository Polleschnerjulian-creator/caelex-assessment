/**
 * Webhooks Management
 * GET - List webhooks for organization
 * POST - Create new webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CreateWebhookSchema } from "@/lib/validations";
import {
  getOrganizationWebhooks,
  createWebhook,
  WEBHOOK_EVENTS,
} from "@/lib/services/webhook-service";

const CreateWebhookBodySchema = CreateWebhookSchema.extend({
  headers: z.record(z.string(), z.string().max(500)).optional(),
});

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

    // Verify user is a member of the organization with sufficient permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 },
      );
    }

    // At minimum ADMIN role required to view webhooks (contains sensitive config)
    if (!["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view webhooks" },
        { status: 403 },
      );
    }

    const webhooks = await getOrganizationWebhooks(organizationId);

    // Don't expose secrets in list view
    const sanitizedWebhooks = webhooks.map((wh) => ({
      ...wh,
      secret: undefined,
      secretPrefix: "..." + wh.secret.slice(-4),
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
    const parsed = CreateWebhookBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, name, url, events, headers } = parsed.data;

    // Verify user is a member of the organization with sufficient permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 },
      );
    }

    // Only OWNER, ADMIN, or MANAGER can manage webhooks
    if (!["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Validate events against known events
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
