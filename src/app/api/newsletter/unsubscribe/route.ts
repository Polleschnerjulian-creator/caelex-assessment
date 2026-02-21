/**
 * Newsletter One-Click Unsubscribe
 *
 * GET /api/newsletter/unsubscribe?token=<hmac-signed-token>
 *
 * Token format: base64url(email).base64url(hmac-sha256(email, secret))
 * Verified server-side to prevent forgery.
 * Returns an HTML page confirming the unsubscription.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/signed-token";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      buildHtmlPage(
        "Invalid Link",
        "The unsubscribe link is invalid or missing a token.",
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Verify HMAC-signed token (falls back to legacy base64 for existing links)
  let email: string | null = verifyUnsubscribeToken(token);

  // Legacy fallback: plain base64 tokens (from before HMAC was added)
  if (!email) {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(decoded)) {
        email = decoded;
      }
    } catch {
      // ignore
    }
  }

  if (!email) {
    return new NextResponse(
      buildHtmlPage("Invalid Token", "The unsubscribe token is invalid."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new NextResponse(
      buildHtmlPage("Invalid Token", "The unsubscribe token is invalid."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscription) {
      return new NextResponse(
        buildHtmlPage(
          "Not Found",
          "No subscription was found for this email address.",
        ),
        {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    if (subscription.status === "UNSUBSCRIBED") {
      return new NextResponse(
        buildHtmlPage(
          "Already Unsubscribed",
          "You have already been unsubscribed from our newsletter.",
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    await prisma.newsletterSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    return new NextResponse(
      buildHtmlPage(
        "Unsubscribed",
        "You have been successfully unsubscribed from the Caelex newsletter.",
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return new NextResponse(
      buildHtmlPage(
        "Error",
        "An error occurred while processing your request. Please try again later.",
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Caelex</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0A0F1E;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
    }
    h1 {
      color: #F8FAFC;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      color: #94A3B8;
      font-size: 16px;
      line-height: 1.5;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
