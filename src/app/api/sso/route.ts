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
    console.error("Error fetching SSO configuration:", error);
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
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (!provider || !Object.values(SSOProvider).includes(provider)) {
      return NextResponse.json(
        { error: "Invalid SSO provider" },
        { status: 400 },
      );
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
        defaultRole: defaultRole as OrganizationRole,
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
    console.error("Error configuring SSO:", error);
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

    await disableSSOConnection(organizationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disabling SSO:", error);
    return NextResponse.json(
      { error: "Failed to disable SSO" },
      { status: 500 },
    );
  }
}
