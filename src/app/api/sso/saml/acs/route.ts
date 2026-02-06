/**
 * SAML Assertion Consumer Service (ACS)
 * POST - Handle SAML Response from IdP
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSOConnection } from "@/lib/services/sso-service";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("orgId");

    if (!organizationId) {
      return redirectWithError("Missing organization ID");
    }

    // Get SSO connection
    const connection = await getSSOConnection(organizationId);
    if (!connection || !connection.isActive) {
      return redirectWithError("SSO not configured for this organization");
    }

    // Parse form data
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse");
    const relayState = formData.get("RelayState");

    if (!samlResponse || typeof samlResponse !== "string") {
      return redirectWithError("Invalid SAML response");
    }

    // Decode and parse SAML response
    // Note: In production, you would use a proper SAML library like saml2-js or passport-saml
    // This is a simplified placeholder implementation

    try {
      const decoded = Buffer.from(samlResponse, "base64").toString("utf-8");

      // Basic XML parsing to extract user info
      // In production, validate signature, check conditions, etc.
      const emailMatch = decoded.match(
        /<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/,
      );
      const nameMatch = decoded.match(
        /<saml:Attribute Name="displayName"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/,
      );

      if (!emailMatch) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description: "SAML login failed: No email in response",
          organizationId,
          riskLevel: "MEDIUM",
          metadata: { error: "Missing email" },
        });
        return redirectWithError("Invalid SAML response: missing email");
      }

      const email = emailMatch[1];
      const name = nameMatch ? nameMatch[1] : email.split("@")[0];

      // Parse relay state for return URL
      let returnUrl = "/dashboard";
      if (relayState) {
        try {
          const state = JSON.parse(
            Buffer.from(relayState as string, "base64url").toString("utf-8"),
          );
          if (state.returnUrl) {
            returnUrl = state.returnUrl;
          }
        } catch {
          // Ignore relay state parsing errors
        }
      }

      // Get request info for logging
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        "unknown";

      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: `SAML login successful for ${email}`,
        organizationId,
        ipAddress,
        metadata: { email, name, provider: "SAML" },
      });

      // In a real implementation, you would:
      // 1. Find or create the user
      // 2. Add them to the organization if auto-provision is enabled
      // 3. Create a session
      // 4. Redirect to the return URL with session cookie

      // For now, redirect to login with SSO token
      const host = headersList.get("host") || "localhost:3000";
      const protocol = headersList.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      // Create a temporary token for the SSO login
      const ssoToken = Buffer.from(
        JSON.stringify({
          email,
          name,
          organizationId,
          provider: "SAML",
          timestamp: Date.now(),
        }),
      ).toString("base64url");

      return NextResponse.redirect(
        `${baseUrl}/api/auth/callback/sso?token=${ssoToken}&returnUrl=${encodeURIComponent(returnUrl)}`,
      );
    } catch (parseError) {
      console.error("Error parsing SAML response:", parseError);

      await logSecurityEvent({
        event: "SSO_LOGIN",
        description: "SAML login failed: Parse error",
        organizationId,
        riskLevel: "MEDIUM",
        metadata: { error: String(parseError) },
      });

      return redirectWithError("Failed to process SAML response");
    }
  } catch (error) {
    console.error("Error in SAML ACS:", error);
    return redirectWithError("Internal server error");
  }
}

function redirectWithError(message: string): NextResponse {
  const errorUrl = `/login?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(errorUrl, "http://localhost:3000"));
}
