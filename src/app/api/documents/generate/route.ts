/**
 * Document Generation API
 *
 * POST /api/documents/generate
 *
 * Generates AI-powered compliance documents.
 * Supports streaming (SSE) and non-streaming responses.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  generateDocument,
  generateDocumentStream,
} from "@/lib/astra/document-generator";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";

const VALID_TYPES: DocumentGenerationType[] = [
  "DEBRIS_MITIGATION_PLAN",
  "CYBERSECURITY_FRAMEWORK",
  "ENVIRONMENTAL_FOOTPRINT",
  "INSURANCE_COMPLIANCE",
  "NIS2_ASSESSMENT",
  "AUTHORIZATION_APPLICATION",
];

export async function POST(request: NextRequest) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    // Rate limit (reuse 'sensitive' tier: 5/hour)
    const rateLimitResult = await checkRateLimit(
      "sensitive",
      getIdentifier(request, userId),
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse body
    const body = await request.json();
    const {
      documentType,
      assessmentId,
      language = "en",
      stream = false,
    } = body as {
      documentType: string;
      assessmentId?: string;
      language?: string;
      stream?: boolean;
    };

    // Validate
    if (
      !documentType ||
      !VALID_TYPES.includes(documentType as DocumentGenerationType)
    ) {
      return NextResponse.json(
        {
          error: `Invalid documentType. Must be one of: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!["en", "de", "fr", "es"].includes(language)) {
      return NextResponse.json(
        { error: "Invalid language. Must be one of: en, de, fr, es" },
        { status: 400 },
      );
    }

    const params = {
      userId,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      documentType: documentType as DocumentGenerationType,
      assessmentId,
      language,
    };

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of generateDocumentStream(params)) {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.close();
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : "Generation failed";
            const data = `data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`;
            controller.enqueue(encoder.encode(data));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const result = await generateDocument(params);

    return NextResponse.json({
      documentId: result.documentId,
      status: "COMPLETED",
      content: result.sections,
      metadata: {
        modelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        generationTimeMs: result.generationTimeMs,
      },
    });
  } catch (error) {
    console.error("Document generation error:", error);
    const message =
      error instanceof Error ? error.message : "Document generation failed";

    // Handle missing assessment data specifically
    if (message.includes("No") && message.includes("found")) {
      return NextResponse.json(
        {
          error:
            "No assessment data found. Please complete the relevant assessment first.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
