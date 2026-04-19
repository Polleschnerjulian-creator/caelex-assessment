import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/verity/certificate/[id]
 * Retrieves a certificate by ID.
 * Auth: NONE for public certificates, Session for private.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const cert = await prisma.verityCertificate.findFirst({
      where: { certificateId: id },
    });

    if (!cert) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 },
      );
    }

    // Public certificates are accessible without auth
    if (cert.isPublic) {
      safeLog("Public certificate accessed", { certificateId: id });
      return NextResponse.json({ certificate: cert.certificate });
    }

    // Private certificates require auth.
    // C3 fix: operatorId semantics unified to organizationId across all
    // verity routes (issue/list/revoke/visibility). Access is granted
    // when the calling user is a member of the owning organisation.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: cert.operatorId,
      },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    safeLog("Private certificate accessed", {
      certificateId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ certificate: cert.certificate });
  } catch (error) {
    safeLog("Certificate retrieval failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to retrieve certificate" },
      { status: 500 },
    );
  }
}
