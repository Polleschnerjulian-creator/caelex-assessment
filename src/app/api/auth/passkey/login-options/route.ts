/**
 * POST /api/auth/passkey/login-options
 * Generates WebAuthn authentication options for login
 */

import { NextResponse } from "next/server";
import { generatePasskeyAuthenticationOptions } from "@/lib/webauthn.server";
import { z } from "zod";

const optionsSchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = optionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { email } = validation.data;
    const { options, userId } =
      await generatePasskeyAuthenticationOptions(email);

    return NextResponse.json({
      options,
      hasCredentials: !!userId,
    });
  } catch (error) {
    console.error("Error generating passkey login options:", error);
    return NextResponse.json(
      { error: "Failed to generate login options" },
      { status: 500 },
    );
  }
}
