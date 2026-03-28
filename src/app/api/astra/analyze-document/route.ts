import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  analyzeDocument,
  getSupportedModules,
} from "@/lib/astra/document-intelligence.server";
import { z } from "zod";

const analyzeSchema = z.object({
  documentText: z.string().min(1).max(500000),
  moduleType: z.string().min(1),
  documentName: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { documentText, moduleType, documentName } = parsed.data;

    const supportedModules = getSupportedModules();
    if (!supportedModules.includes(moduleType)) {
      return NextResponse.json(
        {
          error: `Unsupported module. Available: ${supportedModules.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const analysis = analyzeDocument(documentText, moduleType, documentName);

    return NextResponse.json({ data: { analysis } });
  } catch (error) {
    logger.error("[astra-analyze-document]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
