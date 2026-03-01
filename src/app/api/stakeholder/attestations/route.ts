import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import {
  createAttestation,
  getAttestationsForStakeholder,
} from "@/lib/services/attestation";
import type { AttestationType } from "@prisma/client";

// GET /api/stakeholder/attestations — List attestations for this engagement
export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    const attestations = await getAttestationsForStakeholder(engagement.id);

    return NextResponse.json({ attestations });
  } catch (error) {
    console.error("Stakeholder attestations list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/stakeholder/attestations — Create a new attestation (stakeholder signs)
export async function POST(request: NextRequest) {
  try {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    const schema = z.object({
      type: z.string().min(1),
      title: z.string().min(1),
      statement: z.string().min(1),
      scope: z.string().min(1),
      signerName: z.string().min(1),
      signerTitle: z.string().min(1),
      validUntil: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      type,
      title,
      statement,
      scope,
      signerName,
      signerTitle,
      validUntil,
    } = parsed.data;

    // Create the attestation, auto-filling signer email and org from engagement
    const attestation = await createAttestation({
      organizationId: engagement.organizationId,
      engagementId: engagement.id,
      type: type as AttestationType,
      title,
      statement,
      scope,
      signerName,
      signerTitle,
      signerEmail: engagement.contactEmail,
      signerOrg: engagement.companyName,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      ipAddress,
      userAgent,
    });

    // Log attestation signed access
    await logStakeholderAccess(engagement.id, "attestation_signed", {
      entityType: "compliance_attestation",
      entityId: attestation.id,
      ipAddress,
      userAgent,
      metadata: {
        type,
        title,
        signatureHash: attestation.signatureHash,
      },
    });

    return NextResponse.json({ attestation }, { status: 201 });
  } catch (error) {
    console.error("Stakeholder attestation create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
