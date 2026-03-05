/**
 * Webhook Deliveries
 * GET - List webhook delivery history
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSafeErrorMessage, CuidSchema } from "@/lib/validations";
import {
  getWebhookById,
  getWebhookDeliveries,
  retryDelivery,
} from "@/lib/services/webhook-service";
import { logger } from "@/lib/logger";

const RetryDeliverySchema = z.object({
  organizationId: CuidSchema,
  deliveryId: CuidSchema,
  action: z.enum(["retry"]),
});

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

    // At minimum MANAGER role required to view webhook deliveries
    if (!["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view webhook deliveries" },
        { status: 403 },
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
    logger.error("Error fetching webhook deliveries", error);
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
    const parsed = RetryDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, deliveryId } = parsed.data;

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

    // Only OWNER, ADMIN, or MANAGER can retry webhook deliveries
    if (!["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage webhook deliveries" },
        { status: 403 },
      );
    }

    // Verify webhook belongs to organization
    const webhook = await getWebhookById(webhookId, organizationId);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await retryDelivery(deliveryId);
    return NextResponse.json({ success: true, message: "Retry initiated" });
  } catch (error) {
    logger.error("Error processing delivery action", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to process action") },
      { status: 500 },
    );
  }
}
