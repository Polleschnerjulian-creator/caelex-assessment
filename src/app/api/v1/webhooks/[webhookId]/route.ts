/**
 * Single Webhook Management
 * GET - Get webhook details
 * PATCH - Update webhook
 * DELETE - Delete webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  testWebhook,
  getWebhookStats,
} from "@/lib/services/webhook-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const { webhookId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const includeStats = searchParams.get("stats") === "true";

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const webhook = await getWebhookById(webhookId, organizationId);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Don't expose full secret
    const sanitizedWebhook = {
      ...webhook,
      secret: undefined,
      secretPrefix: webhook.secret.slice(0, 12) + "...",
    };

    let stats = null;
    if (includeStats) {
      stats = await getWebhookStats(webhookId);
    }

    return NextResponse.json({
      webhook: sanitizedWebhook,
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const { webhookId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organizationId,
      name,
      url,
      events,
      headers,
      isActive,
      regenerateSecret,
      test,
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Handle test request
    if (test) {
      const result = await testWebhook(webhookId, organizationId);
      return NextResponse.json({ testResult: result });
    }

    // Handle secret regeneration
    if (regenerateSecret) {
      const newSecret = await regenerateWebhookSecret(
        webhookId,
        organizationId,
      );
      return NextResponse.json({
        secret: newSecret,
        warning:
          "Store this secret securely. You will need it to verify webhook signatures.",
      });
    }

    // Regular update
    const updates: {
      name?: string;
      url?: string;
      events?: string[];
      headers?: Record<string, string>;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updates.name = name;
    if (url !== undefined) {
      // Validate URL
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 },
        );
      }
      updates.url = url;
    }
    if (events !== undefined) updates.events = events;
    if (headers !== undefined) updates.headers = headers;
    if (isActive !== undefined) updates.isActive = isActive;

    const webhook = await updateWebhook(webhookId, organizationId, updates);

    return NextResponse.json({
      webhook: {
        ...webhook,
        secret: undefined,
        secretPrefix: webhook.secret.slice(0, 12) + "...",
      },
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const { webhookId } = await params;
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

    await deleteWebhook(webhookId, organizationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}
