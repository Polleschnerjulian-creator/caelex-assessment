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
 * Map XML Signature algorithm URIs to Node.js crypto algorithm names
 * and their corresponding digest algorithm for DigestValue verification.
 */
const SIGNATURE_ALGORITHMS: Record<
  string,
  { verify: string; digest: string } | undefined
> = {
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256": {
    verify: "RSA-SHA256",
    digest: "sha256",
  },
  "http://www.w3.org/2000/09/xmldsig#rsa-sha1": {
    verify: "RSA-SHA1",
    digest: "sha1",
  },
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512": {
    verify: "RSA-SHA512",
    digest: "sha512",
  },
};

const DIGEST_ALGORITHMS: Record<string, string | undefined> = {
  "http://www.w3.org/2001/04/xmlenc#sha256": "sha256",
  "http://www.w3.org/2000/09/xmldsig#sha1": "sha1",
  "http://www.w3.org/2001/04/xmldsig-more#sha512": "sha512",
};

/**
 * Verify the XML signature on a SAML response using the IdP's X.509 certificate.
 *
 * Steps performed:
 * 1. Extract Reference URI and validate it matches the Assertion ID
 * 2. Compute the digest of the referenced Assertion and verify it matches DigestValue
 * 3. Verify the SignatureValue over SignedInfo using the IdP certificate
 *
 * Returns true only if all checks pass.
 */
function verifySAMLSignature(xml: string, pemCertificate: string): boolean {
  try {
    // ── Step 0: Extract key XML elements ──

    // Extract the SignatureValue
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
    const signedInfoXml = signedInfoMatch[1];

    // Extract DigestValue
    const digestMatch = xml.match(
      /<ds:DigestValue>([\s\S]*?)<\/ds:DigestValue>/,
    );
    if (!digestMatch) return false;
    const expectedDigest = digestMatch[1].replace(/\s/g, "");

    // ── Step 1: Validate Reference URI matches the Assertion ID ──

    const referenceUriMatch = signedInfoXml.match(
      /<ds:Reference\s+URI="([^"]*)"/,
    );
    if (!referenceUriMatch) return false;
    const referenceUri = referenceUriMatch[1];

    // The Reference URI should be "#<AssertionID>" or empty (whole document)
    // Extract the Assertion ID from the SAML response
    const assertionIdMatch =
      xml.match(/<saml:Assertion[^>]+ID="([^"]+)"/) ||
      xml.match(/<Assertion[^>]+ID="([^"]+)"/);

    if (referenceUri) {
      // URI must start with "#" and reference the Assertion ID
      if (!referenceUri.startsWith("#")) return false;
      const referencedId = referenceUri.substring(1);
      if (!assertionIdMatch || referencedId !== assertionIdMatch[1]) {
        return false;
      }
    }

    // ── Step 2: Verify DigestValue matches the digest of the referenced Assertion ──

    // Determine the digest algorithm from DigestMethod
    const digestMethodMatch = signedInfoXml.match(
      /<ds:DigestMethod\s+Algorithm="([^"]+)"/,
    );
    const digestAlgUri = digestMethodMatch?.[1] || "";
    const digestAlgorithm = DIGEST_ALGORITHMS[digestAlgUri] || "sha256";

    // Extract the referenced element for digest computation
    // If URI references an Assertion, extract that element; otherwise use the whole response
    let referencedContent: string;
    if (referenceUri && assertionIdMatch) {
      // Extract the full Assertion element
      const assertionMatch =
        xml.match(/(<saml:Assertion[\s\S]*?<\/saml:Assertion>)/) ||
        xml.match(/(<Assertion[\s\S]*?<\/Assertion>)/);
      if (!assertionMatch) return false;
      referencedContent = assertionMatch[1];
    } else {
      referencedContent = xml;
    }

    // Compute digest of the referenced content (after removing the Signature element)
    const contentWithoutSignature = referencedContent.replace(
      /<ds:Signature[\s\S]*?<\/ds:Signature>/,
      "",
    );
    const computedDigest = crypto
      .createHash(digestAlgorithm)
      .update(contentWithoutSignature)
      .digest("base64");

    if (computedDigest !== expectedDigest) {
      console.error(
        "SAML DigestValue mismatch: assertion content has been tampered with",
      );
      return false;
    }

    // ── Step 3: Verify the SignatureValue over SignedInfo using the certificate ──

    // Normalize the certificate PEM
    const certPem = pemCertificate.includes("BEGIN CERTIFICATE")
      ? pemCertificate
      : `-----BEGIN CERTIFICATE-----\n${pemCertificate}\n-----END CERTIFICATE-----`;

    // Determine signature algorithm from SignatureMethod
    const algMatch = signedInfoXml.match(
      /<ds:SignatureMethod\s+Algorithm="([^"]+)"/,
    );
    const signatureAlgUri = algMatch?.[1] || "";
    const algorithms = SIGNATURE_ALGORITHMS[signatureAlgUri] || {
      verify: "RSA-SHA256",
      digest: "sha256",
    };

    // Verify the cryptographic signature over SignedInfo
    const verifier = crypto.createVerify(algorithms.verify);
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

      // Build redirect URL from environment (never trust Host header)
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
      if (!baseUrl) {
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 },
        );
      }

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
