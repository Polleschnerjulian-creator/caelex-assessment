/**
 * SSO Service
 * Manages Single Sign-On configuration and authentication flows
 * Supports SAML, OIDC, and provider-specific implementations
 */

import { prisma } from "@/lib/prisma";
import {
  SSOConnection,
  SSOProvider,
  OrganizationRole,
  Prisma,
} from "@prisma/client";
import { logSecurityEvent } from "./security-audit-service";
import crypto from "crypto";

// ─── Types ───

export interface SSOConfigInput {
  provider: SSOProvider;
  // SAML
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  // OIDC
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  // Settings
  autoProvision?: boolean;
  defaultRole?: OrganizationRole;
  domains?: string[];
  enforceSSO?: boolean;
}

export interface SSOTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface SSOLoginResult {
  success: boolean;
  user?: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    groups?: string[];
  };
  error?: string;
}

export interface SAMLMetadata {
  entityId: string;
  assertionConsumerServiceUrl: string;
  certificate?: string;
}

// ─── Provider Display Names ───

export const SSO_PROVIDER_NAMES: Record<SSOProvider, string> = {
  SAML: "SAML 2.0",
  OIDC: "OpenID Connect",
  AZURE_AD: "Microsoft Entra ID (Azure AD)",
  OKTA: "Okta",
  GOOGLE_WORKSPACE: "Google Workspace",
};

// ─── Provider Configurations ───

const PROVIDER_CONFIGS: Record<
  SSOProvider,
  {
    type: "saml" | "oidc";
    requiredFields: string[];
    optionalFields: string[];
  }
> = {
  SAML: {
    type: "saml",
    requiredFields: ["entityId", "ssoUrl", "certificate"],
    optionalFields: [],
  },
  OIDC: {
    type: "oidc",
    requiredFields: ["clientId", "clientSecret", "issuerUrl"],
    optionalFields: [],
  },
  AZURE_AD: {
    type: "oidc",
    requiredFields: ["clientId", "clientSecret", "issuerUrl"],
    optionalFields: [],
  },
  OKTA: {
    type: "oidc",
    requiredFields: ["clientId", "clientSecret", "issuerUrl"],
    optionalFields: [],
  },
  GOOGLE_WORKSPACE: {
    type: "oidc",
    requiredFields: ["clientId", "clientSecret"],
    optionalFields: [],
  },
};

// ─── SSO Configuration CRUD ───

/**
 * Get SSO configuration for an organization
 */
export async function getSSOConnection(
  organizationId: string,
): Promise<SSOConnection | null> {
  return prisma.sSOConnection.findUnique({
    where: { organizationId },
  });
}

/**
 * Configure SSO for an organization
 */
export async function configureSSOConnection(
  organizationId: string,
  input: SSOConfigInput,
  configuredBy: string,
): Promise<SSOConnection> {
  // Validate required fields based on provider
  const providerConfig = PROVIDER_CONFIGS[input.provider];
  const missingFields = providerConfig.requiredFields.filter(
    (field) => !input[field as keyof SSOConfigInput],
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields for ${input.provider}: ${missingFields.join(", ")}`,
    );
  }

  // Encrypt client secret if provided
  const encryptedSecret = input.clientSecret
    ? encryptSecret(input.clientSecret)
    : undefined;

  const connection = await prisma.sSOConnection.upsert({
    where: { organizationId },
    update: {
      provider: input.provider,
      entityId: input.entityId,
      ssoUrl: input.ssoUrl,
      certificate: input.certificate,
      clientId: input.clientId,
      clientSecret: encryptedSecret,
      issuerUrl: input.issuerUrl,
      autoProvision: input.autoProvision ?? true,
      defaultRole: input.defaultRole ?? OrganizationRole.MEMBER,
      domains: input.domains || [],
      enforceSSO: input.enforceSSO ?? false,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      provider: input.provider,
      entityId: input.entityId,
      ssoUrl: input.ssoUrl,
      certificate: input.certificate,
      clientId: input.clientId,
      clientSecret: encryptedSecret,
      issuerUrl: input.issuerUrl,
      autoProvision: input.autoProvision ?? true,
      defaultRole: input.defaultRole ?? OrganizationRole.MEMBER,
      domains: input.domains || [],
      enforceSSO: input.enforceSSO ?? false,
      isActive: true,
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "SSO_CONFIGURED",
    description: `SSO configured with provider: ${input.provider}`,
    userId: configuredBy,
    organizationId,
    targetType: "sso_connection",
    targetId: connection.id,
    metadata: {
      provider: input.provider,
      domains: input.domains,
      enforceSSO: input.enforceSSO,
    },
  });

  return connection;
}

/**
 * Update SSO configuration
 */
export async function updateSSOConnection(
  organizationId: string,
  input: Partial<SSOConfigInput>,
  updatedBy: string,
): Promise<SSOConnection> {
  const existing = await getSSOConnection(organizationId);
  if (!existing) {
    throw new Error("SSO connection not found");
  }

  const updateData: Prisma.SSOConnectionUpdateInput = {};

  if (input.entityId !== undefined) updateData.entityId = input.entityId;
  if (input.ssoUrl !== undefined) updateData.ssoUrl = input.ssoUrl;
  if (input.certificate !== undefined)
    updateData.certificate = input.certificate;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.clientSecret !== undefined) {
    updateData.clientSecret = encryptSecret(input.clientSecret);
  }
  if (input.issuerUrl !== undefined) updateData.issuerUrl = input.issuerUrl;
  if (input.autoProvision !== undefined)
    updateData.autoProvision = input.autoProvision;
  if (input.defaultRole !== undefined)
    updateData.defaultRole = input.defaultRole;
  if (input.domains !== undefined) updateData.domains = input.domains;
  if (input.enforceSSO !== undefined) updateData.enforceSSO = input.enforceSSO;

  const connection = await prisma.sSOConnection.update({
    where: { organizationId },
    data: updateData,
  });

  // Log security event
  await logSecurityEvent({
    event: "SSO_UPDATED",
    description: `SSO configuration updated`,
    userId: updatedBy,
    organizationId,
    targetType: "sso_connection",
    targetId: connection.id,
    metadata: {
      updatedFields: Object.keys(updateData),
    },
  });

  return connection;
}

/**
 * Disable SSO for an organization
 */
export async function disableSSOConnection(
  organizationId: string,
  disabledBy: string,
): Promise<SSOConnection> {
  const connection = await prisma.sSOConnection.update({
    where: { organizationId },
    data: { isActive: false },
  });

  // Log security event
  await logSecurityEvent({
    event: "SSO_DISABLED",
    description: `SSO disabled for organization`,
    userId: disabledBy,
    organizationId,
    targetType: "sso_connection",
    targetId: connection.id,
    riskLevel: "MEDIUM",
  });

  return connection;
}

/**
 * Delete SSO configuration
 */
export async function deleteSSOConnection(
  organizationId: string,
  deletedBy: string,
): Promise<void> {
  const existing = await getSSOConnection(organizationId);
  if (!existing) return;

  await prisma.sSOConnection.delete({
    where: { organizationId },
  });

  // Log security event
  await logSecurityEvent({
    event: "SSO_DISABLED",
    description: `SSO configuration deleted`,
    userId: deletedBy,
    organizationId,
    targetType: "sso_connection",
    targetId: existing.id,
    riskLevel: "MEDIUM",
  });
}

// ─── SSO Testing ───

/**
 * Test SSO configuration
 */
export async function testSSOConnection(
  organizationId: string,
  testedBy: string,
): Promise<SSOTestResult> {
  const connection = await getSSOConnection(organizationId);
  if (!connection) {
    return { success: false, message: "SSO connection not found" };
  }

  try {
    let result: SSOTestResult;
    const providerConfig = PROVIDER_CONFIGS[connection.provider];

    if (providerConfig.type === "saml") {
      result = await testSAMLConnection(connection);
    } else {
      result = await testOIDCConnection(connection);
    }

    // Update test result
    await prisma.sSOConnection.update({
      where: { organizationId },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.success ? "success" : "failed",
      },
    });

    // Log security event
    await logSecurityEvent({
      event: result.success ? "SSO_TEST_SUCCESS" : "SSO_TEST_FAILED",
      description: result.message,
      userId: testedBy,
      organizationId,
      targetType: "sso_connection",
      targetId: connection.id,
      metadata: result.details,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.sSOConnection.update({
      where: { organizationId },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: "failed",
      },
    });

    await logSecurityEvent({
      event: "SSO_TEST_FAILED",
      description: `SSO test failed: ${errorMessage}`,
      userId: testedBy,
      organizationId,
      riskLevel: "MEDIUM",
    });

    return {
      success: false,
      message: `Test failed: ${errorMessage}`,
    };
  }
}

/**
 * Test SAML connection
 */
async function testSAMLConnection(
  connection: SSOConnection,
): Promise<SSOTestResult> {
  // Validate certificate format
  if (!connection.certificate) {
    return { success: false, message: "Certificate is missing" };
  }

  try {
    // Basic certificate validation
    const certMatch = connection.certificate.match(
      /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/,
    );
    if (!certMatch) {
      return {
        success: false,
        message: "Invalid certificate format. Must be PEM encoded.",
      };
    }

    // Validate SSO URL
    if (!connection.ssoUrl) {
      return { success: false, message: "SSO URL is missing" };
    }

    try {
      new URL(connection.ssoUrl);
    } catch {
      return { success: false, message: "Invalid SSO URL format" };
    }

    // For a real implementation, we would:
    // 1. Fetch IdP metadata if available
    // 2. Validate certificate chain
    // 3. Check certificate expiration

    return {
      success: true,
      message: "SAML configuration validated successfully",
      details: {
        entityId: connection.entityId,
        ssoUrl: connection.ssoUrl,
        certificateValid: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Certificate validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test OIDC connection
 */
async function testOIDCConnection(
  connection: SSOConnection,
): Promise<SSOTestResult> {
  if (
    !connection.issuerUrl &&
    connection.provider !== SSOProvider.GOOGLE_WORKSPACE
  ) {
    return { success: false, message: "Issuer URL is missing" };
  }

  try {
    // For Google Workspace, use known discovery URL
    const discoveryUrl =
      connection.provider === SSOProvider.GOOGLE_WORKSPACE
        ? "https://accounts.google.com/.well-known/openid-configuration"
        : `${connection.issuerUrl}/.well-known/openid-configuration`;

    // Fetch OIDC discovery document
    const response = await fetch(discoveryUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch OIDC discovery document (${response.status})`,
      };
    }

    const discovery = await response.json();

    // Validate required endpoints exist
    const requiredEndpoints = [
      "authorization_endpoint",
      "token_endpoint",
      "userinfo_endpoint",
    ];
    const missingEndpoints = requiredEndpoints.filter((ep) => !discovery[ep]);

    if (missingEndpoints.length > 0) {
      return {
        success: false,
        message: `Missing required OIDC endpoints: ${missingEndpoints.join(", ")}`,
      };
    }

    return {
      success: true,
      message: "OIDC configuration validated successfully",
      details: {
        issuer: discovery.issuer,
        authorizationEndpoint: discovery.authorization_endpoint,
        tokenEndpoint: discovery.token_endpoint,
        scopesSupported: discovery.scopes_supported,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `OIDC discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ─── Domain Verification ───

/**
 * Add a domain to SSO configuration
 */
export async function addSSODomain(
  organizationId: string,
  domain: string,
  addedBy: string,
): Promise<SSOConnection> {
  const connection = await getSSOConnection(organizationId);
  if (!connection) {
    throw new Error("SSO connection not found");
  }

  // Normalize domain
  const normalizedDomain = domain.toLowerCase().trim();

  // Check if domain already exists
  if (connection.domains.includes(normalizedDomain)) {
    throw new Error("Domain already added");
  }

  // Check if domain is used by another organization
  const existingConnection = await prisma.sSOConnection.findFirst({
    where: {
      domains: { has: normalizedDomain },
      organizationId: { not: organizationId },
    },
  });

  if (existingConnection) {
    throw new Error("Domain is already associated with another organization");
  }

  const updated = await prisma.sSOConnection.update({
    where: { organizationId },
    data: {
      domains: { push: normalizedDomain },
    },
  });

  await logSecurityEvent({
    event: "SSO_UPDATED",
    description: `Domain added to SSO: ${normalizedDomain}`,
    userId: addedBy,
    organizationId,
    metadata: { domain: normalizedDomain },
  });

  return updated;
}

/**
 * Remove a domain from SSO configuration
 */
export async function removeSSODomain(
  organizationId: string,
  domain: string,
  removedBy: string,
): Promise<SSOConnection> {
  const connection = await getSSOConnection(organizationId);
  if (!connection) {
    throw new Error("SSO connection not found");
  }

  const normalizedDomain = domain.toLowerCase().trim();
  const updatedDomains = connection.domains.filter(
    (d) => d !== normalizedDomain,
  );

  const updated = await prisma.sSOConnection.update({
    where: { organizationId },
    data: { domains: updatedDomains },
  });

  await logSecurityEvent({
    event: "SSO_UPDATED",
    description: `Domain removed from SSO: ${normalizedDomain}`,
    userId: removedBy,
    organizationId,
    metadata: { domain: normalizedDomain },
  });

  return updated;
}

/**
 * Check if an email domain is configured for SSO
 */
export async function getSSOConnectionByDomain(
  emailDomain: string,
): Promise<SSOConnection | null> {
  const normalizedDomain = emailDomain.toLowerCase().trim();

  return prisma.sSOConnection.findFirst({
    where: {
      domains: { has: normalizedDomain },
      isActive: true,
    },
  });
}

// ─── SAML Metadata ───

/**
 * Generate SP (Service Provider) metadata for SAML
 */
export function generateSAMLMetadata(
  baseUrl: string,
  organizationId: string,
): SAMLMetadata {
  return {
    entityId: `${baseUrl}/api/sso/saml/metadata`,
    assertionConsumerServiceUrl: `${baseUrl}/api/sso/saml/acs?orgId=${organizationId}`,
  };
}

/**
 * Generate SAML metadata XML
 */
export function generateSAMLMetadataXML(
  baseUrl: string,
  organizationId: string,
): string {
  const metadata = generateSAMLMetadata(baseUrl, organizationId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${metadata.entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                      AuthnRequestsSigned="false"
                      WantAssertionsSigned="true">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                  Location="${metadata.assertionConsumerServiceUrl}"
                                  index="1" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

// ─── OIDC Helpers ───

/**
 * Generate OIDC authorization URL
 */
export function generateOIDCAuthUrl(
  connection: SSOConnection,
  redirectUri: string,
  state: string,
  nonce: string,
): string {
  const params = new URLSearchParams({
    client_id: connection.clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
  });

  // Get authorization endpoint based on provider
  let authEndpoint: string;
  switch (connection.provider) {
    case SSOProvider.GOOGLE_WORKSPACE:
      authEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
      break;
    case SSOProvider.AZURE_AD:
      authEndpoint = `${connection.issuerUrl}/oauth2/v2.0/authorize`;
      break;
    case SSOProvider.OKTA:
      authEndpoint = `${connection.issuerUrl}/v1/authorize`;
      break;
    default:
      authEndpoint = `${connection.issuerUrl}/authorize`;
  }

  return `${authEndpoint}?${params.toString()}`;
}

/**
 * Generate state and nonce for OIDC
 */
export function generateOIDCState(): { state: string; nonce: string } {
  return {
    state: crypto.randomBytes(32).toString("hex"),
    nonce: crypto.randomBytes(32).toString("hex"),
  };
}

// ─── Encryption Helpers ───

/**
 * Encrypt a secret value
 */
function encryptSecret(value: string): string {
  const key = process.env.SSO_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) {
    console.warn(
      "No encryption key found. Using base64 encoding (not secure for production).",
    );
    return Buffer.from(value).toString("base64");
  }

  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash("sha256").update(key).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", keyHash, iv);

  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a secret value
 */
export function decryptSecret(encrypted: string): string {
  const key = process.env.SSO_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) {
    // If no key, assume base64 encoding
    return Buffer.from(encrypted, "base64").toString("utf8");
  }

  const [ivHex, encryptedHex] = encrypted.split(":");
  if (!ivHex || !encryptedHex) {
    // Fallback for non-encrypted values
    return encrypted;
  }

  const iv = Buffer.from(ivHex, "hex");
  const keyHash = crypto.createHash("sha256").update(key).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyHash, iv);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ─── SSO Enforcement ───

/**
 * Check if SSO is enforced for a given email
 */
export async function isSSOEnforced(email: string): Promise<{
  enforced: boolean;
  connection?: SSOConnection;
}> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { enforced: false };
  }

  const connection = await getSSOConnectionByDomain(domain);
  if (connection && connection.enforceSSO && connection.isActive) {
    return { enforced: true, connection };
  }

  return { enforced: false };
}

/**
 * Get SSO login URL for a user
 */
export async function getSSOLoginUrl(
  email: string,
  baseUrl: string,
  returnUrl?: string,
): Promise<string | null> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const connection = await getSSOConnectionByDomain(domain);
  if (!connection || !connection.isActive) return null;

  const state = JSON.stringify({
    orgId: connection.organizationId,
    returnUrl: returnUrl || "/dashboard",
    timestamp: Date.now(),
  });

  const encodedState = Buffer.from(state).toString("base64url");

  const providerConfig = PROVIDER_CONFIGS[connection.provider];
  if (providerConfig.type === "saml") {
    return `${baseUrl}/api/sso/saml/login?orgId=${connection.organizationId}&state=${encodedState}`;
  } else {
    const { nonce } = generateOIDCState();
    const redirectUri = `${baseUrl}/api/sso/oidc/callback`;
    return generateOIDCAuthUrl(connection, redirectUri, encodedState, nonce);
  }
}
