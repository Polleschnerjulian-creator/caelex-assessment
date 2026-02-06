/**
 * Webhook Deliveries
 * GET - List webhook delivery history
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getWebhookById,
  getWebhookDeliveries,
  retryDelivery,
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
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "20"),
      100,
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify webhook belongs to organization
    const webhook = await getWebhookById(webhookId, organizationId);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const result = await getWebhookDeliveries(webhookId, page, pageSize);

    return NextResponse.json({
      deliveries: result.deliveries,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook deliveries" },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const { organizationId, deliveryId, action } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify webhook belongs to organization
    const webhook = await getWebhookById(webhookId, organizationId);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    if (action === "retry" && deliveryId) {
      await retryDelivery(deliveryId);
      return NextResponse.json({ success: true, message: "Retry initiated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing delivery action:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to process action") },
      { status: 500 },
    );
  }
}
