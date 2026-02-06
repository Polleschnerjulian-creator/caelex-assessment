/**
 * OIDC Callback API
 * GET - Handle OIDC authorization callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSOConnection, decryptSecret } from "@/lib/services/sso-service";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
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
      console.error("OIDC error:", error, errorDescription);
      return redirectWithError(errorDescription || error);
    }

    if (!code || !state) {
      return redirectWithError("Invalid callback parameters");
    }

    // Parse state to get organization ID and return URL
    let organizationId: string;
    let returnUrl = "/dashboard";

    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64url").toString("utf-8"),
      );
      organizationId = stateData.orgId;
      returnUrl = stateData.returnUrl || "/dashboard";
    } catch {
      return redirectWithError("Invalid state parameter");
    }

    // Get SSO connection
    const connection = await getSSOConnection(organizationId);
    if (!connection || !connection.isActive) {
      return redirectWithError("SSO not configured for this organization");
    }

    // Get base URL
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

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
          ? decryptSecret(connection.clientSecret)
          : "",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);

      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: "OIDC login failed: Token exchange error",
        organizationId,
        riskLevel: "MEDIUM",
        metadata: { error: errorData },
      });

      return redirectWithError("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();

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
        metadata: { userInfo },
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

    // Create a temporary token for the SSO login
    const ssoToken = Buffer.from(
      JSON.stringify({
        email,
        name,
        organizationId,
        provider: connection.provider,
        timestamp: Date.now(),
      }),
    ).toString("base64url");

    return NextResponse.redirect(
      `${baseUrl}/api/auth/callback/sso?token=${ssoToken}&returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  } catch (error) {
    console.error("Error in OIDC callback:", error);
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

function redirectWithError(message: string): NextResponse {
  const errorUrl = `/login?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(errorUrl, "http://localhost:3000"));
}
