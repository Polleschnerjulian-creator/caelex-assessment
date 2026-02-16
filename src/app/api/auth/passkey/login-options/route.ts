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
    const { options, userId, challengeToken } =
      await generatePasskeyAuthenticationOptions(email);

    // Set challenge token in httpOnly cookie (stateless, works across serverless instances)
    const response = NextResponse.json({
      options,
      hasCredentials: !!userId,
    });
    response.cookies.set("__webauthn_challenge", challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/api/auth/passkey",
    });
    return response;
  } catch (error) {
    console.error("Error generating passkey login options:", error);
    return NextResponse.json(
      { error: "Failed to generate login options" },
      { status: 500 },
    );
  }
}
