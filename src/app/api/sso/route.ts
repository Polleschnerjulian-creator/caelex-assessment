/**
 * SSO Configuration API
 * GET - Get SSO configuration for organization
 * POST - Configure SSO for organization
 * DELETE - Disable SSO for organization
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  getSSOConnection,
  configureSSOConnection,
  disableSSOConnection,
  SSO_PROVIDER_NAMES,
} from "@/lib/services/sso-service";
import { SSOProvider, OrganizationRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ─── Zod Schema for SSO Configuration ───

const SSOConfigSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  provider: z.nativeEnum(SSOProvider, {
    message: "Invalid SSO provider",
  }),
  // SAML fields
  entityId: z.string().max(2048).optional(),
  ssoUrl: z.string().url("Invalid SSO URL").max(2048).optional(),
  certificate: z.string().max(16384).optional(),
  // OIDC fields
  clientId: z.string().max(512).optional(),
  clientSecret: z.string().max(1024).optional(),
  issuerUrl: z.string().url("Invalid issuer URL").max(2048).optional(),
  // Settings
  autoProvision: z.boolean().optional(),
  defaultRole: z
    .nativeEnum(OrganizationRole, {
      message: "Invalid organization role",
    })
    .optional(),
  domains: z
    .array(
      z
        .string()
        .min(1)
        .max(255)
        .regex(
          /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/,
          "Invalid domain format",
        ),
    )
    .max(50, "Too many domains")
    .optional(),
  enforceSSO: z.boolean().optional(),
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

    // Verify user has admin access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const connection = await getSSOConnection(organizationId);

    if (!connection) {
      return NextResponse.json({
        configured: false,
        providers: Object.entries(SSO_PROVIDER_NAMES).map(([value, label]) => ({
          value,
          label,
        })),
      });
    }

    // Don't return sensitive data
    return NextResponse.json({
      configured: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        providerName: SSO_PROVIDER_NAMES[connection.provider],
        entityId: connection.entityId,
        ssoUrl: connection.ssoUrl,
        issuerUrl: connection.issuerUrl,
        clientId: connection.clientId,
        autoProvision: connection.autoProvision,
        defaultRole: connection.defaultRole,
        domains: connection.domains,
        enforceSSO: connection.enforceSSO,
        isActive: connection.isActive,
        lastTestedAt: connection.lastTestedAt,
        lastTestResult: connection.lastTestResult,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
      providers: Object.entries(SSO_PROVIDER_NAMES).map(([value, label]) => ({
        value,
        label,
      })),
    });
  } catch (error) {
    logger.error("Error fetching SSO configuration", error);
    return NextResponse.json(
      { error: "Failed to fetch SSO configuration" },
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

    // Validate input with Zod schema
    const parseResult = SSOConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      organizationId,
      provider,
      entityId,
      ssoUrl,
      certificate,
      clientId,
      clientSecret,
      issuerUrl,
      autoProvision,
      defaultRole,
      domains,
      enforceSSO,
    } = parseResult.data;

    // Verify user has admin access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const connection = await configureSSOConnection(
      organizationId,
      {
        provider,
        entityId,
        ssoUrl,
        certificate,
        clientId,
        clientSecret,
        issuerUrl,
        autoProvision,
        defaultRole,
        domains,
        enforceSSO,
      },
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        providerName: SSO_PROVIDER_NAMES[connection.provider],
        isActive: connection.isActive,
      },
    });
  } catch (error) {
    logger.error("Error configuring SSO", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to configure SSO"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Verify user has admin access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await disableSSOConnection(organizationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error disabling SSO", error);
    return NextResponse.json(
      { error: "Failed to disable SSO" },
      { status: 500 },
    );
  }
}
