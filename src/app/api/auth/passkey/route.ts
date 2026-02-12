/**
 * GET /api/auth/passkey
 * Returns user's registered passkeys
 *
 * DELETE /api/auth/passkey
 * Removes a passkey
 *
 * PATCH /api/auth/passkey
 * Renames a passkey
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getUserPasskeys,
  deletePasskey,
  renamePasskey,
} from "@/lib/webauthn.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const passkeys = await getUserPasskeys(session.user.id);

    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error("Error getting passkeys:", error);
    return NextResponse.json(
      { error: "Failed to get passkeys" },
      { status: 500 },
    );
  }
}

const deleteSchema = z.object({
  credentialId: z.string(),
});

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { credentialId } = validation.data;
    const success = await deletePasskey(session.user.id, credentialId);

    if (!success) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "PASSKEY_REMOVED",
      entityType: "WebAuthnCredential",
      entityId: credentialId,
      metadata: { removed: true },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Passkey removed successfully",
    });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 },
    );
  }
}

const renameSchema = z.object({
  credentialId: z.string(),
  name: z.string().min(1).max(100),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = renameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { credentialId, name } = validation.data;
    const success = await renamePasskey(session.user.id, credentialId, name);

    if (!success) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Passkey renamed successfully",
    });
  } catch (error) {
    console.error("Error renaming passkey:", error);
    return NextResponse.json(
      { error: "Failed to rename passkey" },
      { status: 500 },
    );
  }
}
