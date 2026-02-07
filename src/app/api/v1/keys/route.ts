/**
 * API Keys Management
 * GET - List API keys for organization
 * POST - Create new API key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationApiKeys,
  createApiKey,
  API_SCOPES,
} from "@/lib/services/api-key-service";

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

    const keys = await getOrganizationApiKeys(organizationId);

    return NextResponse.json({
      keys,
      availableScopes: Object.entries(API_SCOPES).map(
        ([scope, description]) => ({
          scope,
          description,
        }),
      ),
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
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
    const { organizationId, name, scopes, rateLimit, expiresAt } = body;

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

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "At least one scope is required" },
        { status: 400 },
      );
    }

    // Validate scopes
    const validScopes = Object.keys(API_SCOPES);
    const invalidScopes = scopes.filter(
      (s: string) => !validScopes.includes(s) && s !== "*",
    );
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 },
      );
    }

    const { apiKey, plainTextKey } = await createApiKey({
      organizationId,
      name,
      scopes,
      rateLimit: rateLimit || 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdById: session.user.id,
    });

    return NextResponse.json({
      key: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      // Only return the plain text key once, on creation
      plainTextKey,
      warning:
        "This is the only time you will see the full API key. Store it securely.",
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}
