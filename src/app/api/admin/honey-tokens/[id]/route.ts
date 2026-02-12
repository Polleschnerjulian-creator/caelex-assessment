/**
 * Admin: Honey Token Detail API
 *
 * GET /api/admin/honey-tokens/[id] — Get honey token details with triggers
 * PATCH /api/admin/honey-tokens/[id] — Update honey token settings
 * DELETE /api/admin/honey-tokens/[id] — Delete a honey token
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { NextResponse } from "next/server";
import {
  getHoneyTokenDetails,
  updateHoneyToken,
  deleteHoneyToken,
} from "@/lib/honey-tokens.server";
import { z } from "zod";

const updateHoneyTokenSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  alertEmail: z.string().email().optional().nullable(),
  alertWebhookUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { id } = await params;
    const honeyToken = await getHoneyTokenDetails(id);

    if (!honeyToken) {
      return NextResponse.json(
        { error: "Honey token not found" },
        { status: 404 },
      );
    }

    // Mask the token value
    return NextResponse.json({
      honeyToken: {
        ...honeyToken,
        tokenValue: maskToken(honeyToken.tokenValue),
      },
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error fetching honey token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateHoneyTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const honeyToken = await updateHoneyToken(id, {
      name: parsed.data.name,
      description: parsed.data.description ?? undefined,
      alertEmail: parsed.data.alertEmail,
      alertWebhookUrl: parsed.data.alertWebhookUrl,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json({
      honeyToken: {
        ...honeyToken,
        tokenValue: maskToken(honeyToken.tokenValue),
      },
      message: "Honey token updated successfully",
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error updating honey token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { id } = await params;
    await deleteHoneyToken(id);

    return NextResponse.json({
      message: "Honey token deleted successfully",
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error deleting honey token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Mask a token value for display
 */
function maskToken(token: string): string {
  if (token.length <= 16) {
    return token.slice(0, 4) + "****" + token.slice(-4);
  }
  return token.slice(0, 8) + "..." + token.slice(-4);
}
