/**
 * Shield Configuration API
 *
 * GET  /api/shield/config — Returns org's CAConfig or defaults if none exists.
 * PUT  /api/shield/config — Updates/creates CAConfig. Requires ADMIN+ role.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const configUpdateSchema = z.object({
  emergencyPcThreshold: z.number().positive().max(1).optional(),
  highPcThreshold: z.number().positive().max(1).optional(),
  elevatedPcThreshold: z.number().positive().max(1).optional(),
  monitorPcThreshold: z.number().positive().max(1).optional(),
  notifyOnTier: z
    .enum(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR", "INFORMATIONAL"])
    .optional(),
  emergencyEmailAll: z.boolean().optional(),
  autoCloseAfterTcaHours: z.number().int().min(1).max(168).optional(),
  ncaAutoNotify: z.boolean().optional(),
  ncaJurisdiction: z.string().max(10).nullable().optional(),
  defaultAssigneeId: z.string().nullable().optional(),
  leolabsEnabled: z.boolean().optional(),
  leolabsApiKey: z.string().optional(),
});

const DEFAULT_CONFIG = {
  emergencyPcThreshold: 0.001,
  highPcThreshold: 0.0001,
  elevatedPcThreshold: 0.00001,
  monitorPcThreshold: 0.0000001,
  notifyOnTier: "HIGH" as const,
  emergencyEmailAll: true,
  autoCloseAfterTcaHours: 24,
  ncaAutoNotify: false,
  ncaJurisdiction: null,
  defaultAssigneeId: null,
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const config = await prisma.cAConfig.findUnique({
      where: { organizationId: membership.organizationId },
    });

    const responseData = config
      ? {
          ...config,
          leolabsApiKey: undefined,
          leolabsApiKeyMasked: config.leolabsApiKey
            ? "••••••" + config.leolabsApiKey.slice(-6)
            : null,
          leolabsEnabled: config.leolabsEnabled ?? false,
        }
      : {
          ...DEFAULT_CONFIG,
          organizationId: membership.organizationId,
          leolabsEnabled: false,
          leolabsApiKeyMasked: null,
        };

    return NextResponse.json({ data: responseData });
  } catch (error) {
    logger.error("Failed to get shield config", error);
    return NextResponse.json(
      { error: "Failed to get shield config" },
      { status: 500 },
    );
  }
}

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    if (!ADMIN_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parseResult = configUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid configuration",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    // Encrypt LeoLabs API key before storing
    const persistData = {
      ...data,
      leolabsApiKey: data.leolabsApiKey
        ? await encrypt(data.leolabsApiKey)
        : undefined,
    };

    const config = await prisma.cAConfig.upsert({
      where: { organizationId: membership.organizationId },
      create: {
        organizationId: membership.organizationId,
        ...persistData,
      },
      update: persistData,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_config_updated",
      entityType: "ca_config",
      entityId: config.id,
      newValue: data,
      description: "Shield conjunction assessment configuration updated",
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    logger.error("Failed to update shield config", error);
    return NextResponse.json(
      { error: "Failed to update shield config" },
      { status: 500 },
    );
  }
}
