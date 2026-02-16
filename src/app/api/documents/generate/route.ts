/**
 * Document Generation API
 *
 * POST /api/documents/generate
 *
 * Generates AI-powered compliance documents.
 * Supports streaming (SSE) and non-streaming responses.
 */

import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  generateDocument,
  generateDocumentStream,
  generateDocumentForRecord,
} from "@/lib/astra/document-generator";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";

export const maxDuration = 120; // AI generation needs time for Anthropic API call

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

    // Rate limit (5 documents per hour per user)
    const rateLimitResult = await checkRateLimit(
      "document_generation",
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

    // Async mode — create record, start generation in background, return immediately
    if (body.async) {
      const meta = DOCUMENT_TYPE_META[documentType as DocumentGenerationType];
      const doc = await prisma.generatedDocument.create({
        data: {
          userId,
          organizationId: membership.organization.id,
          documentType: documentType as DocumentGenerationType,
          title: meta.title,
          language,
          assessmentId,
          status: "PENDING",
          promptVersion: "v1.0",
        },
      });

      // Run generation after response is sent — uses Vercel waitUntil under the hood
      after(async () => {
        try {
          await generateDocumentForRecord(doc.id, params);
        } catch (error) {
          console.error(
            `Async document generation failed for ${doc.id}:`,
            error,
          );
        }
      });

      return NextResponse.json({
        documentId: doc.id,
        status: "GENERATING",
      });
    }

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
            const errorMsg = getSafeErrorMessage(error, "Generation failed");
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
    const message = getSafeErrorMessage(error, "Document generation failed");

    // Handle missing assessment data specifically
    if (
      error instanceof Error &&
      error.message.includes("No") &&
      error.message.includes("found")
    ) {
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
