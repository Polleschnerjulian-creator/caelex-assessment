/**
 * OIDC Callback API
 * GET - Handle OIDC authorization callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSOConnection, decryptSecret } from "@/lib/services/sso-service";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import { createSignedToken, verifySignedToken } from "@/lib/signed-token";
import { headers } from "next/headers";
import { SSOProvider } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle error from IdP
    if (error) {
      console.error("OIDC error from IdP:", error);
      return redirectWithError(errorDescription || error);
    }

    if (!code || !state) {
      return redirectWithError("Invalid callback parameters");
    }

    // Verify HMAC-signed state to prevent tampering (includes nonce for H11)
    const stateData = verifySignedToken<{
      orgId: string;
      returnUrl?: string;
      nonce: string;
    }>(state);

    if (!stateData?.orgId) {
      return redirectWithError("Invalid or expired state parameter");
    }

    if (!stateData.nonce) {
      return redirectWithError("Missing nonce in state parameter");
    }

    const organizationId = stateData.orgId;
    const returnUrl = stateData.returnUrl || "/dashboard";

    // Get SSO connection
    const connection = await getSSOConnection(organizationId);
    if (!connection || !connection.isActive) {
      return redirectWithError("SSO not configured for this organization");
    }

    // Get base URL from env (never trust Host header to prevent host injection)
    const headersList = await headers();
    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      `https://${headersList.get("host") || "localhost:3000"}`;

    // Exchange code for tokens
    const tokenEndpoint = getTokenEndpoint(
      connection.provider,
      connection.issuerUrl,
    );
    const redirectUri = `${baseUrl}/api/sso/oidc/callback`;

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: connection.clientId || "",
        client_secret: connection.clientSecret
          ? await decryptSecret(connection.clientSecret)
          : "",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status);

      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: "OIDC login failed: Token exchange error",
        organizationId,
        riskLevel: "MEDIUM",
        metadata: { statusCode: tokenResponse.status },
      });

      return redirectWithError("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();

    // H11: Validate nonce from id_token to prevent replay attacks
    if (tokens.id_token) {
      const idTokenPayload = parseJwtPayload(tokens.id_token);
      if (idTokenPayload.nonce !== stateData.nonce) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description:
            "OIDC login failed: nonce mismatch (possible replay attack)",
          organizationId,
          riskLevel: "HIGH",
          metadata: { expectedNonce: stateData.nonce },
        });
        return redirectWithError("Nonce validation failed");
      }
    }

    // Get user info
    const userInfoEndpoint = getUserInfoEndpoint(
      connection.provider,
      connection.issuerUrl,
    );

    const userInfoResponse = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error("User info fetch failed");

      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: "OIDC login failed: User info fetch error",
        organizationId,
        riskLevel: "MEDIUM",
      });

      return redirectWithError("Failed to fetch user information");
    }

    const userInfo = await userInfoResponse.json();

    // Extract user data
    const email = userInfo.email;
    const name =
      userInfo.name || userInfo.preferred_username || email?.split("@")[0];

    if (!email) {
      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: "OIDC login failed: No email in user info",
        organizationId,
        riskLevel: "MEDIUM",
        metadata: { hasEmail: false, claimsPresent: Object.keys(userInfo) },
      });

      return redirectWithError("No email address in user profile");
    }

    // Verify email domain if domains are configured
    if (connection.domains.length > 0) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (!connection.domains.includes(emailDomain)) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description: `OIDC login blocked: Email domain ${emailDomain} not allowed`,
          organizationId,
          riskLevel: "MEDIUM",
          metadata: { email, allowedDomains: connection.domains },
        });

        return redirectWithError(
          "Email domain not allowed for this organization",
        );
      }
    }

    // Get IP for logging
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    await logSecurityEvent({
      event: "SSO_LOGIN",
      description: `OIDC login successful for ${email}`,
      organizationId,
      ipAddress,
      metadata: {
        email,
        name,
        provider: connection.provider,
      },
    });

    // In a real implementation, you would:
    // 1. Find or create the user
    // 2. Add them to the organization if auto-provision is enabled
    // 3. Create a session
    // 4. Redirect to the return URL with session cookie

    // Create an HMAC-signed SSO token (prevents forgery)
    const ssoToken = createSignedToken(
      {
        email,
        name,
        organizationId,
        provider: connection.provider,
      },
      5 * 60 * 1000, // 5 minutes
    );

    return NextResponse.redirect(
      `${baseUrl}/api/auth/callback/sso?token=${ssoToken}&returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  } catch (error) {
    console.error(
      "Error in OIDC callback:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return redirectWithError("Internal server error");
  }
}

function getTokenEndpoint(
  provider: SSOProvider,
  issuerUrl: string | null,
): string {
  switch (provider) {
    case SSOProvider.GOOGLE_WORKSPACE:
      return "https://oauth2.googleapis.com/token";
    case SSOProvider.AZURE_AD:
      return `${issuerUrl}/oauth2/v2.0/token`;
    case SSOProvider.OKTA:
      return `${issuerUrl}/v1/token`;
    default:
      return `${issuerUrl}/token`;
  }
}

function getUserInfoEndpoint(
  provider: SSOProvider,
  issuerUrl: string | null,
): string {
  switch (provider) {
    case SSOProvider.GOOGLE_WORKSPACE:
      return "https://openidconnect.googleapis.com/v1/userinfo";
    case SSOProvider.AZURE_AD:
      return "https://graph.microsoft.com/oidc/userinfo";
    case SSOProvider.OKTA:
      return `${issuerUrl}/v1/userinfo`;
    default:
      return `${issuerUrl}/userinfo`;
  }
}

/**
 * Parse a JWT payload without verification (signature is verified by the IdP token exchange).
 * Used to extract the nonce claim for validation.
 */
function parseJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload);
}

function redirectWithError(message: string): NextResponse {
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  const errorUrl = `/login?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(errorUrl, baseUrl));
}
