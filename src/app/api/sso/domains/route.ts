/**
 * SSO Domains API
 * POST - Add a domain to SSO configuration
 * DELETE - Remove a domain from SSO configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validations";
import { addSSODomain, removeSSODomain } from "@/lib/services/sso-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, domain } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 },
      );
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 },
      );
    }

    const connection = await addSSODomain(
      organizationId,
      domain,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      domains: connection.domains,
    });
  } catch (error) {
    console.error("Error adding SSO domain:", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to add domain"),
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
    const domain = searchParams.get("domain");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 },
      );
    }

    const connection = await removeSSODomain(
      organizationId,
      domain,
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      domains: connection.domains,
    });
  } catch (error) {
    console.error("Error removing SSO domain:", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to remove domain"),
      },
      { status: 500 },
    );
  }
}
