/**
 * Single API Key Management
 * GET - Get API key details
 * PATCH - Update API key
 * DELETE - Revoke API key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CuidSchema, sanitizeString } from "@/lib/validations";
import {
  getApiKeyById,
  updateApiKey,
  revokeApiKey,
  regenerateApiKey,
  getApiKeyUsageStats,
} from "@/lib/services/api-key-service";

const PatchApiKeySchema = z.object({
  organizationId: CuidSchema,
  name: z.string().min(1).max(100).transform(sanitizeString).optional(),
  scopes: z
    .array(
      z
        .string()
        .max(50)
        .regex(/^[a-z:_*]+$/, "Invalid scope format"),
    )
    .min(1)
    .max(20)
    .optional(),
  rateLimit: z.coerce.number().int().min(10).max(10000).optional(),
  isActive: z.boolean().optional(),
  regenerate: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const { keyId } = await params;
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

    const key = await getApiKeyById(keyId, organizationId);
    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    let stats = null;
    if (includeStats) {
      stats = await getApiKeyUsageStats(keyId);
    }

    return NextResponse.json({
      key,
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const { keyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PatchApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, name, scopes, rateLimit, isActive, regenerate } =
      parsed.data;

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

    // Only OWNER or ADMIN can modify API keys
    if (!["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage API keys" },
        { status: 403 },
      );
    }

    // Handle regenerate request
    if (regenerate) {
      const { apiKey, plainTextKey } = await regenerateApiKey(
        keyId,
        organizationId,
        session.user.id,
      );

      return NextResponse.json({
        key: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit,
          createdAt: apiKey.createdAt,
        },
        plainTextKey,
        warning:
          "This is the only time you will see the full API key. Store it securely.",
      });
    }

    // Regular update
    const updates: {
      name?: string;
      scopes?: string[];
      rateLimit?: number;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updates.name = name;
    if (scopes !== undefined) updates.scopes = scopes;
    if (rateLimit !== undefined) updates.rateLimit = rateLimit;
    if (isActive !== undefined) updates.isActive = isActive;

    const key = await updateApiKey(keyId, organizationId, updates);

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Error updating API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const { keyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const reason = searchParams.get("reason");

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

    // Only OWNER or ADMIN can revoke API keys
    if (!["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage API keys" },
        { status: 403 },
      );
    }

    await revokeApiKey(
      keyId,
      organizationId,
      session.user.id,
      reason || undefined,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }
}
