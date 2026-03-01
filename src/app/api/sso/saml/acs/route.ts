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
 * SECURITY: Uses structural validation to prevent XML Signature Wrapping (XSW) attacks:
 * 1. Extracts the Assertion that contains the Signature (not just any Assertion)
 * 2. Validates the Reference URI points to the parent Assertion's ID
 * 3. Verifies DigestValue matches the Assertion content (minus Signature)
 * 4. Cryptographically verifies the SignatureValue over SignedInfo
 *
 * This prevents wrapping attacks where a forged Assertion is placed before
 * the legitimately signed one.
 */
function verifySAMLSignature(xml: string, pemCertificate: string): boolean {
  try {
    // ── Step 0: Extract the Assertion that CONTAINS the Signature ──
    // This is the critical XSW defense: we only trust the Assertion that
    // wraps the Signature element, not the first Assertion found.

    // Find ALL Assertion elements and identify which one contains a Signature
    const assertionRegex =
      /(<(?:saml:|samlp?:)?Assertion[^>]+ID="([^"]+)"[\s\S]*?<\/(?:saml:|samlp?:)?Assertion>)/g;
    let signedAssertion: string | null = null;
    let signedAssertionId: string | null = null;
    let match: RegExpExecArray | null;

    while ((match = assertionRegex.exec(xml)) !== null) {
      const assertion = match[1];
      const assertionId = match[2];
      // The signed Assertion is the one that contains the ds:Signature
      if (
        assertion.includes("<ds:Signature") ||
        assertion.includes("<Signature")
      ) {
        if (signedAssertion !== null) {
          // Multiple Assertions contain signatures — reject as suspicious
          console.error("SAML: Multiple signed Assertions found — rejecting");
          return false;
        }
        signedAssertion = assertion;
        signedAssertionId = assertionId;
      }
    }

    // If no Assertion contains a Signature, check for Response-level signature
    if (!signedAssertion) {
      // Response-level signatures are also valid but we extract claims from
      // the Assertion inside. For now, require Assertion-level signatures.
      console.error("SAML: No Assertion with embedded Signature found");
      return false;
    }

    // ── Step 1: Extract signature components from the SIGNED Assertion ──

    const sigValueMatch = signedAssertion.match(
      /<ds:SignatureValue[^>]*>([\s\S]*?)<\/ds:SignatureValue>/,
    );
    if (!sigValueMatch) return false;
    const signatureValue = sigValueMatch[1].replace(/\s/g, "");

    const signedInfoMatch = signedAssertion.match(
      /(<ds:SignedInfo[\s\S]*?<\/ds:SignedInfo>)/,
    );
    if (!signedInfoMatch) return false;
    const signedInfoXml = signedInfoMatch[1];

    const digestMatch = signedAssertion.match(
      /<ds:DigestValue>([\s\S]*?)<\/ds:DigestValue>/,
    );
    if (!digestMatch) return false;
    const expectedDigest = digestMatch[1].replace(/\s/g, "");

    // ── Step 2: Validate Reference URI points to THIS Assertion's ID ──

    const referenceUriMatch = signedInfoXml.match(
      /<ds:Reference\s+URI="([^"]*)"/,
    );
    if (!referenceUriMatch) return false;
    const referenceUri = referenceUriMatch[1];

    if (referenceUri) {
      if (!referenceUri.startsWith("#")) return false;
      const referencedId = referenceUri.substring(1);
      if (referencedId !== signedAssertionId) {
        console.error(
          "SAML: Reference URI does not match the signed Assertion ID",
        );
        return false;
      }
    }

    // ── Step 3: Verify DigestValue of the Assertion (minus its Signature element) ──

    const digestMethodMatch = signedInfoXml.match(
      /<ds:DigestMethod\s+Algorithm="([^"]+)"/,
    );
    const digestAlgUri = digestMethodMatch?.[1] || "";
    const digestAlgorithm = DIGEST_ALGORITHMS[digestAlgUri] || "sha256";

    // Remove the Signature element from the signed Assertion for digest computation
    const assertionWithoutSignature = signedAssertion.replace(
      /<ds:Signature[\s\S]*?<\/ds:Signature>/,
      "",
    );
    const computedDigest = crypto
      .createHash(digestAlgorithm)
      .update(assertionWithoutSignature)
      .digest("base64");

    if (computedDigest !== expectedDigest) {
      console.error(
        "SAML DigestValue mismatch: assertion content has been tampered with",
      );
      return false;
    }

    // ── Step 4: Verify the SignatureValue over SignedInfo using the certificate ──

    const certPem = pemCertificate.includes("BEGIN CERTIFICATE")
      ? pemCertificate
      : `-----BEGIN CERTIFICATE-----\n${pemCertificate}\n-----END CERTIFICATE-----`;

    const algMatch = signedInfoXml.match(
      /<ds:SignatureMethod\s+Algorithm="([^"]+)"/,
    );
    const signatureAlgUri = algMatch?.[1] || "";
    const algorithms = SIGNATURE_ALGORITHMS[signatureAlgUri] || {
      verify: "RSA-SHA256",
      digest: "sha256",
    };

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

      // ── Extract Claims from the SIGNED Assertion only ──
      // SECURITY: Extract claims from the verified Assertion, not from the
      // full XML document (which could contain forged unsigned Assertions).
      // Find the Assertion that contains the Signature (same logic as verifySAMLSignature)
      const assertionForClaims = extractSignedAssertion(decoded);
      const claimsSource = assertionForClaims || decoded;

      const emailMatch = claimsSource.match(
        /<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/,
      );
      const nameMatch = claimsSource.match(
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

/**
 * Extract the Assertion element that contains the ds:Signature.
 * Used to ensure claims are extracted from the verified Assertion only.
 */
function extractSignedAssertion(xml: string): string | null {
  const assertionRegex =
    /(<(?:saml:|samlp?:)?Assertion[^>]+ID="[^"]+"[\s\S]*?<\/(?:saml:|samlp?:)?Assertion>)/g;
  let match: RegExpExecArray | null;
  while ((match = assertionRegex.exec(xml)) !== null) {
    if (match[1].includes("<ds:Signature") || match[1].includes("<Signature")) {
      return match[1];
    }
  }
  return null;
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
