/**
 * WebAuthn / Passkeys Service
 * Handles passkey registration and authentication
 */

import "server-only";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { createSignedToken, verifySignedToken } from "@/lib/signed-token";

// Configuration
const rpName = "Caelex";
const rpID =
  process.env.WEBAUTHN_RP_ID ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("WEBAUTHN_RP_ID is required in production");
      })()
    : "localhost");
const origin = process.env.WEBAUTHN_ORIGIN || `https://${rpID}`;

// Challenge tokens are HMAC-signed and stateless — no server-side storage needed.
// This works correctly across serverless instances (Vercel, etc.).

// Generate registration options for new passkey
export async function generatePasskeyRegistrationOptions(
  userId: string,
  userEmail: string,
  userName?: string,
): Promise<{
  options: Awaited<ReturnType<typeof generateRegistrationOptions>>;
  challengeToken: string;
}> {
  // Get existing credentials to exclude
  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.credentialId,
    transports: cred.transports
      ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
      : undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(userId),
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: "none", // Don't require attestation for broader compatibility
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform", // Prefer platform authenticators (TouchID, FaceID)
    },
  });

  // Create HMAC-signed challenge token (stateless, works across serverless instances)
  const challengeToken = createSignedToken(
    { userId, challenge: options.challenge, type: "registration" },
    5 * 60 * 1000, // 5 minutes
  );

  return { options, challengeToken };
}

// Verify registration response and save credential
export async function verifyPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  challengeToken: string,
  deviceName?: string,
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  // Verify the HMAC-signed challenge token
  const tokenData = verifySignedToken<{
    userId: string;
    challenge: string;
    type: string;
  }>(challengeToken);

  if (
    !tokenData ||
    tokenData.userId !== userId ||
    tokenData.type !== "registration"
  ) {
    return { success: false, error: "Invalid or expired challenge" };
  }

  const expectedChallenge = tokenData.challenge;

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    console.error(
      "WebAuthn registration verification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { success: false, error: "Verification failed" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { success: false, error: "Verification failed" };
  }

  const { registrationInfo } = verification;
  const { credential, credentialDeviceType, aaguid } = registrationInfo;

  // Check if credential already exists
  const existingCredential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: Buffer.from(credential.id).toString("base64url") },
  });

  if (existingCredential) {
    return { success: false, error: "Credential already registered" };
  }

  // Save the credential
  const savedCredential = await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: Buffer.from(credential.id).toString("base64url"),
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      deviceName: deviceName || `${credentialDeviceType} authenticator`,
      deviceType: credentialDeviceType,
      aaguid: aaguid || undefined,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
    },
  });

  return { success: true, credentialId: savedCredential.id };
}

// Generate authentication options for login
export async function generatePasskeyAuthenticationOptions(
  userEmail?: string,
): Promise<{
  options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
  userId?: string;
  challengeToken: string;
}> {
  let allowCredentials: {
    id: string;
    transports?: AuthenticatorTransportFuture[];
  }[] = [];
  let userId: string | undefined;

  // If email provided, only allow that user's credentials
  if (userEmail) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        webAuthnCredentials: {
          select: { credentialId: true, transports: true },
        },
      },
    });

    if (user && user.webAuthnCredentials.length > 0) {
      userId = user.id;
      allowCredentials = user.webAuthnCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials:
      allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  // Create HMAC-signed challenge token (stateless, works across serverless instances)
  const challengeToken = createSignedToken(
    {
      userId: userId || "anonymous",
      challenge: options.challenge,
      type: "authentication",
    },
    5 * 60 * 1000, // 5 minutes
  );

  return { options, userId, challengeToken };
}

// Verify authentication response and return user
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  challengeToken: string,
  expectedUserId?: string,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Verify the HMAC-signed challenge token
  const tokenData = verifySignedToken<{
    userId: string;
    challenge: string;
    type: string;
  }>(challengeToken);

  if (!tokenData || tokenData.type !== "authentication") {
    return { success: false, error: "Invalid or expired challenge" };
  }

  // Find the credential
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });

  if (!credential) {
    return { success: false, error: "Credential not found" };
  }

  // If expectedUserId is provided, verify it matches
  if (expectedUserId && credential.userId !== expectedUserId) {
    return { success: false, error: "Credential does not belong to user" };
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    // Decode the stored credentials from base64
    const credentialPublicKey = Uint8Array.from(
      Buffer.from(credential.publicKey, "base64"),
    );

    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: tokenData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: credentialPublicKey,
        counter: credential.counter,
        transports: credential.transports
          ? (JSON.parse(
              credential.transports,
            ) as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch (error) {
    console.error(
      "WebAuthn authentication verification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { success: false, error: "Verification failed" };
  }

  if (!verification.verified) {
    return { success: false, error: "Verification failed" };
  }

  // Update counter and last used
  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  return { success: true, userId: credential.userId };
}

// Get user's passkeys
export async function getUserPasskeys(userId: string) {
  return prisma.webAuthnCredential.findMany({
    where: { userId },
    select: {
      id: true,
      deviceName: true,
      deviceType: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Delete a passkey
export async function deletePasskey(
  userId: string,
  credentialId: string,
): Promise<boolean> {
  const credential = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    return false;
  }

  await prisma.webAuthnCredential.delete({
    where: { id: credentialId },
  });

  return true;
}

// Rename a passkey
export async function renamePasskey(
  userId: string,
  credentialId: string,
  newName: string,
): Promise<boolean> {
  const credential = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    return false;
  }

  await prisma.webAuthnCredential.update({
    where: { id: credentialId },
    data: { deviceName: newName },
  });

  return true;
}

// Check if user has any passkeys
export async function hasPasskeys(userId: string): Promise<boolean> {
  const count = await prisma.webAuthnCredential.count({
    where: { userId },
  });
  return count > 0;
}
