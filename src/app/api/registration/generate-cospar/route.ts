/**
 * Generate COSPAR ID Suggestion
 * POST - Generate a suggested COSPAR ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateCOSPARSuggestion } from "@/lib/services/registration-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const cosparSchema = z.object({
      launchYear: z.union([z.string(), z.number()]).refine(
        (val) => {
          const num = typeof val === "string" ? parseInt(val) : val;
          return !isNaN(num) && num >= 1957 && num <= 2100;
        },
        { message: "Launch year must be between 1957 and 2100" },
      ),
      launchNumber: z.union([z.string(), z.number()]).optional(),
      sequence: z.string().optional(),
    });

    const parsed = cosparSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { launchYear, launchNumber, sequence } = parsed.data;

    const year =
      typeof launchYear === "string" ? parseInt(launchYear) : launchYear;

    const suggestion = generateCOSPARSuggestion(
      year,
      launchNumber
        ? typeof launchNumber === "string"
          ? parseInt(launchNumber)
          : launchNumber
        : undefined,
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
