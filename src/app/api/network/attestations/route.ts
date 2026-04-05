/**
 * Network Attestations API
 * GET - List compliance attestations
 * POST - Create a new compliance attestation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { createAttestation, getAttestations } from "@/lib/services/attestation";
import { logger } from "@/lib/logger";
import { parsePaginationLimit } from "@/lib/validations";
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
    const limit = parsePaginationLimit(searchParams.get("limit"));

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
    logger.error("Failed to fetch attestations", error);
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

    const schema = z.object({
      organizationId: z.string().min(1),
      engagementId: z.string().min(1),
      type: z.enum([
        "LEGAL_REVIEW",
        "AUDIT_CLEARANCE",
        "INSURANCE_BINDING",
        "SUPPLIER_CERT",
        "NCA_APPROVAL",
        "COMPLIANCE_SIGN_OFF",
      ]),
      title: z.string().min(1),
      statement: z.string().min(1),
      scope: z
        .string()
        .min(1)
        .refine((val) => {
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        }, "Must be valid JSON"),
      signerName: z.string().min(1),
      signerTitle: z.string().min(1),
      signerEmail: z.string().email(),
      signerOrg: z.string().min(1),
      validUntil: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, ...attestationData } = parsed.data;

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
    logger.error("Failed to create attestation", error);
    return NextResponse.json(
      { error: "Failed to create attestation" },
      { status: 500 },
    );
  }
}
