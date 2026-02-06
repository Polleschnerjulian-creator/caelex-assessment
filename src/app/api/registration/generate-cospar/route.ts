/**
 * Generate COSPAR ID Suggestion
 * POST - Generate a suggested COSPAR ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCOSPARSuggestion } from "@/lib/services/registration-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { launchYear, launchNumber, sequence } = body;

    if (!launchYear) {
      return NextResponse.json(
        { error: "Launch year is required" },
        { status: 400 },
      );
    }

    const year = parseInt(launchYear);
    if (isNaN(year) || year < 1957 || year > 2100) {
      return NextResponse.json(
        { error: "Invalid launch year" },
        { status: 400 },
      );
    }

    const suggestion = generateCOSPARSuggestion(
      year,
      launchNumber ? parseInt(launchNumber) : undefined,
      sequence,
    );

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Error generating COSPAR ID:", error);
    return NextResponse.json(
      { error: "Failed to generate COSPAR ID" },
      { status: 500 },
    );
  }
}
