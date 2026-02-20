/**
 * Network Attestations API
 * GET - List compliance attestations
 * POST - Create a new compliance attestation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { createAttestation, getAttestations } from "@/lib/services/attestation";
import type { AttestationType } from "@prisma/client";

// ─── GET: List Attestations ───

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const type = searchParams.get("type") as AttestationType | null;
    const engagementId = searchParams.get("engagementId");
    const isRevoked = searchParams.get("isRevoked");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getAttestations(
      organizationId,
      {
        type: type || undefined,
        engagementId: engagementId || undefined,
        isRevoked: isRevoked !== null ? isRevoked === "true" : undefined,
      },
      { page, limit },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch attestations:", error);
    return NextResponse.json(
      { error: "Failed to fetch attestations" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Attestation ───

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, ...attestationData } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:attest")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate required fields
    if (
      !attestationData.engagementId ||
      !attestationData.type ||
      !attestationData.title ||
      !attestationData.statement ||
      !attestationData.scope ||
      !attestationData.signerName ||
      !attestationData.signerTitle ||
      !attestationData.signerEmail ||
      !attestationData.signerOrg
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: engagementId, type, title, statement, scope, signerName, signerTitle, signerEmail, signerOrg",
        },
        { status: 400 },
      );
    }

    // Extract IP and user-agent from request headers
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const attestation = await createAttestation({
      organizationId,
      engagementId: attestationData.engagementId,
      type: attestationData.type,
      title: attestationData.title,
      statement: attestationData.statement,
      scope: attestationData.scope,
      signerName: attestationData.signerName,
      signerTitle: attestationData.signerTitle,
      signerEmail: attestationData.signerEmail,
      signerOrg: attestationData.signerOrg,
      validUntil: attestationData.validUntil
        ? new Date(attestationData.validUntil)
        : undefined,
      entityType: attestationData.entityType,
      entityId: attestationData.entityId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, attestation });
  } catch (error) {
    console.error("Failed to create attestation:", error);
    return NextResponse.json(
      { error: "Failed to create attestation" },
      { status: 500 },
    );
  }
}
