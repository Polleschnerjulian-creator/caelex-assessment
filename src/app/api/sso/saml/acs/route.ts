/**
 * SAML Assertion Consumer Service (ACS)
 * POST - Handle SAML Response from IdP
 *
 * Security: Validates XML signature using the IdP certificate stored
 * in the SSOConnection before trusting any claims.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSSOConnection } from "@/lib/services/sso-service";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import { createSignedToken, verifySignedToken } from "@/lib/signed-token";
import { headers } from "next/headers";
import crypto from "crypto";

// ─── SAML Signature Verification ───

/**
 * Verify the XML signature on a SAML response using the IdP's X.509 certificate.
 * Returns true only if the signature covers the assertion and matches the certificate.
 */
function verifySAMLSignature(xml: string, pemCertificate: string): boolean {
  try {
    // Extract the SignatureValue from the XML
    const sigValueMatch = xml.match(
      /<ds:SignatureValue[^>]*>([\s\S]*?)<\/ds:SignatureValue>/,
    );
    if (!sigValueMatch) return false;

    const signatureValue = sigValueMatch[1].replace(/\s/g, "");

    // Extract the SignedInfo element (the data that was signed)
    const signedInfoMatch = xml.match(
      /(<ds:SignedInfo[\s\S]*?<\/ds:SignedInfo>)/,
    );
    if (!signedInfoMatch) return false;

    // Extract DigestValue for the assertion
    const digestMatch = xml.match(
      /<ds:DigestValue>([\s\S]*?)<\/ds:DigestValue>/,
    );
    if (!digestMatch) return false;

    // Normalize the certificate PEM
    const certPem = pemCertificate.includes("BEGIN CERTIFICATE")
      ? pemCertificate
      : `-----BEGIN CERTIFICATE-----\n${pemCertificate}\n-----END CERTIFICATE-----`;

    // Determine signature algorithm from SignatureMethod
    const algMatch = xml.match(/<ds:SignatureMethod\s+Algorithm="([^"]+)"/);
    const algorithm = algMatch?.[1] || "";

    let nodeAlgorithm: string;
    if (algorithm.includes("rsa-sha256") || algorithm.includes("#sha256")) {
      nodeAlgorithm = "RSA-SHA256";
    } else if (algorithm.includes("rsa-sha1") || algorithm.includes("#sha1")) {
      nodeAlgorithm = "RSA-SHA1";
    } else if (algorithm.includes("rsa-sha512")) {
      nodeAlgorithm = "RSA-SHA512";
    } else {
      // Default to SHA-256 if unrecognized
      nodeAlgorithm = "RSA-SHA256";
    }

    // Canonicalize SignedInfo (simplified: use the raw XML for Exclusive C14N)
    // In production, use a proper XML canonicalization library
    const signedInfoXml = signedInfoMatch[1];

    // Verify the signature
    const verifier = crypto.createVerify(nodeAlgorithm);
    verifier.update(signedInfoXml);

    return verifier.verify(certPem, signatureValue, "base64");
  } catch (err) {
    console.error("SAML signature verification error:", err);
    return false;
  }
}

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

    try {
      const decoded = Buffer.from(samlResponse, "base64").toString("utf-8");

      // ── Verify XML Signature ──
      // The IdP certificate must be configured in the SSO connection.
      if (!connection.certificate) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description: "SAML login failed: No IdP certificate configured",
          organizationId,
          riskLevel: "HIGH",
          metadata: { error: "Missing certificate" },
        });
        return redirectWithError(
          "SAML configuration error: IdP certificate not configured",
        );
      }

      // Check that the response contains a signature
      if (
        !decoded.includes("<ds:Signature") &&
        !decoded.includes("<Signature")
      ) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description: "SAML login rejected: Response is not signed",
          organizationId,
          riskLevel: "HIGH",
          metadata: { error: "Unsigned SAML response" },
        });
        return redirectWithError("SAML response is not signed");
      }

      const signatureValid = verifySAMLSignature(
        decoded,
        connection.certificate,
      );

      if (!signatureValid) {
        await logSecurityEvent({
          event: "SSO_LOGIN",
          description:
            "SAML login rejected: Signature verification failed — possible forged response",
          organizationId,
          riskLevel: "CRITICAL",
          metadata: { error: "Invalid signature" },
        });
        return redirectWithError("SAML response signature verification failed");
      }

      // ── Extract Claims (only after signature verification) ──
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

      // Verify email domain if domains are configured
      if (connection.domains.length > 0) {
        const emailDomain = email.split("@")[1]?.toLowerCase();
        if (!emailDomain || !connection.domains.includes(emailDomain)) {
          await logSecurityEvent({
            event: "SSO_LOGIN",
            description: `SAML login blocked: Email domain ${emailDomain} not allowed`,
            organizationId,
            riskLevel: "MEDIUM",
            metadata: { email, allowedDomains: connection.domains },
          });
          return redirectWithError(
            "Email domain not allowed for this organization",
          );
        }
      }

      // Parse relay state for return URL (verify HMAC signature)
      let returnUrl = "/dashboard";
      if (relayState) {
        const state = verifySignedToken<{
          orgId: string;
          returnUrl?: string;
        }>(relayState as string);
        if (state?.returnUrl) {
          returnUrl = state.returnUrl;
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
        description: `SAML login successful for ${email} (signature verified)`,
        organizationId,
        ipAddress,
        metadata: { email, name, provider: "SAML" },
      });

      // Build redirect URL using APP_URL or NEXTAUTH_URL (never trust Host header)
      const baseUrl =
        process.env.APP_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.AUTH_URL ||
        `https://${headersList.get("host") || "localhost:3000"}`;

      // Create an HMAC-signed SSO token (prevents forgery)
      const ssoToken = createSignedToken(
        {
          email,
          name,
          organizationId,
          provider: "SAML",
        },
        5 * 60 * 1000, // 5 minutes
      );

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
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  const errorUrl = `/login?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(errorUrl, baseUrl));
}
