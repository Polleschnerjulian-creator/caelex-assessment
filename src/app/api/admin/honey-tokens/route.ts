/**
 * Admin: Honey Token Management API
 *
 * GET /api/admin/honey-tokens — List all honey tokens
 * POST /api/admin/honey-tokens — Create a new honey token
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { NextResponse } from "next/server";
import {
  listHoneyTokens,
  createHoneyToken,
  generateFakeApiKey,
  generateFakeAwsCredential,
  generateFakeDatabaseUrl,
} from "@/lib/honey-tokens.server";
import { z } from "zod";
import { HoneyTokenType } from "@prisma/client";

const createHoneyTokenSchema = z.object({
  tokenType: z.nativeEnum(HoneyTokenType),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tokenValue: z.string().min(1).max(1000).optional(),
  alertEmail: z.string().email().optional().nullable(),
  alertWebhookUrl: z.string().url().optional().nullable(),
  contextPath: z.string().max(500).optional(),
  contextType: z.string().max(100).optional(),
  autoGenerate: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const honeyTokens = await listHoneyTokens();

    // Mask the actual token values for security
    const maskedTokens = honeyTokens.map((token) => ({
      ...token,
      tokenValue: maskToken(token.tokenValue),
    }));

    return NextResponse.json({ honeyTokens: maskedTokens });
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
    console.error("Admin: Error fetching honey tokens:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = createHoneyTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { autoGenerate, ...data } = parsed.data;

    // Auto-generate token value based on type if requested
    let tokenValue = data.tokenValue;
    if (autoGenerate || !tokenValue) {
      tokenValue = generateTokenValue(data.tokenType);
    }

    const honeyToken = await createHoneyToken({
      tokenType: data.tokenType,
      name: data.name,
      description: data.description ?? undefined,
      tokenValue,
      alertEmail: data.alertEmail ?? undefined,
      alertWebhookUrl: data.alertWebhookUrl ?? undefined,
      contextPath: data.contextPath,
      contextType: data.contextType,
    });

    return NextResponse.json({
      honeyToken: {
        ...honeyToken,
        // Return full value on creation so admin can deploy it
        tokenValue: honeyToken.tokenValue,
      },
      message:
        "Honey token created successfully. Deploy this value in your trap location.",
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
    console.error("Admin: Error creating honey token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Generate a realistic token value based on type
 */
function generateTokenValue(tokenType: HoneyTokenType): string {
  switch (tokenType) {
    case HoneyTokenType.API_KEY:
      return generateFakeApiKey();
    case HoneyTokenType.AWS_CREDENTIAL:
      // Generate both access key and secret as a pair
      return `AKIAFAKE${generateRandomString(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")}:${generateFakeAwsCredential("secret")}`;
    case HoneyTokenType.DATABASE_URL:
      return generateFakeDatabaseUrl("postgres");
    case HoneyTokenType.OAUTH_SECRET:
      return `oauth_secret_fake_${crypto.randomUUID()}`;
    case HoneyTokenType.JWT_SECRET:
      return crypto.randomUUID() + crypto.randomUUID();
    case HoneyTokenType.ENCRYPTION_KEY:
      return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    case HoneyTokenType.WEBHOOK_SECRET:
      return `whsec_fake_${crypto.randomUUID().replace(/-/g, "")}`;
    case HoneyTokenType.SSH_KEY:
      return `-----BEGIN FAKE SSH PRIVATE KEY-----\nFAKE_KEY_DO_NOT_USE_${crypto.randomUUID()}\n-----END FAKE SSH PRIVATE KEY-----`;
    case HoneyTokenType.ADMIN_PASSWORD:
      return `admin_fake_${generateRandomString(16)}`;
    case HoneyTokenType.CUSTOM:
    default:
      return `fake_token_${crypto.randomUUID()}`;
  }
}

function generateRandomString(
  length: number,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
): string {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
}

/**
 * Mask a token value for display (show first 8 and last 4 chars)
 */
function maskToken(token: string): string {
  if (token.length <= 16) {
    return token.slice(0, 4) + "****" + token.slice(-4);
  }
  return token.slice(0, 8) + "..." + token.slice(-4);
}
