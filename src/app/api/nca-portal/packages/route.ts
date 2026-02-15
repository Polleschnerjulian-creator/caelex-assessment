/**
 * NCA Portal Packages API
 * GET  - List user's packages
 * POST - Assemble new document package for NCA
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assemblePackage,
  getPackages,
} from "@/lib/services/nca-portal-service";
import type { NCAAuthority } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packages = await getPackages(session.user.id);

    return NextResponse.json({ packages });
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
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
    const { ncaAuthority, organizationId } = body;

    if (!ncaAuthority || !organizationId) {
      return NextResponse.json(
        { error: "ncaAuthority and organizationId are required" },
        { status: 400 },
      );
    }

    const result = await assemblePackage(
      session.user.id,
      organizationId,
      ncaAuthority as NCAAuthority,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to assemble package:", error);
    return NextResponse.json(
      { error: "Failed to assemble package" },
      { status: 500 },
    );
  }
}
