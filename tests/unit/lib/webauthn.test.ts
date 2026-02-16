import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────
vi.mock("server-only", () => ({}));

const {
  mockPrisma,
  mockGenerateRegistrationOptions,
  mockVerifyRegistrationResponse,
  mockGenerateAuthenticationOptions,
  mockVerifyAuthenticationResponse,
} = vi.hoisted(() => {
  const mockPrisma = {
    webAuthnCredential: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
  const mockGenerateRegistrationOptions = vi.fn();
  const mockVerifyRegistrationResponse = vi.fn();
  const mockGenerateAuthenticationOptions = vi.fn();
  const mockVerifyAuthenticationResponse = vi.fn();
  return {
    mockPrisma,
    mockGenerateRegistrationOptions,
    mockVerifyRegistrationResponse,
    mockGenerateAuthenticationOptions,
    mockVerifyAuthenticationResponse,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mockGenerateRegistrationOptions,
  verifyRegistrationResponse: mockVerifyRegistrationResponse,
  generateAuthenticationOptions: mockGenerateAuthenticationOptions,
  verifyAuthenticationResponse: mockVerifyAuthenticationResponse,
}));

import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  getUserPasskeys,
  deletePasskey,
  renamePasskey,
  hasPasskeys,
} from "@/lib/webauthn.server";

// ─── Helpers ─────────────────────────────────────────────

function makeRegistrationResponse(overrides = {}): {
  id: string;
  rawId: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
    transports?: string[];
  };
  clientExtensionResults: Record<string, unknown>;
  type: string;
} {
  return {
    id: "credential-id-base64url",
    rawId: "credential-raw-id",
    response: {
      attestationObject: "attestation-object-base64",
      clientDataJSON: "client-data-json-base64",
      transports: ["internal"],
    },
    clientExtensionResults: {},
    type: "public-key",
    ...overrides,
  };
}

function makeAuthenticationResponse(id = "cred-id-1"): {
  id: string;
  rawId: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle: string;
  };
  clientExtensionResults: Record<string, unknown>;
  type: string;
} {
  return {
    id,
    rawId: "raw-id-base64",
    response: {
      authenticatorData: "auth-data-base64",
      clientDataJSON: "client-data-json-base64",
      signature: "signature-base64",
      userHandle: "user-handle-base64",
    },
    clientExtensionResults: {},
    type: "public-key",
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("WebAuthn / Passkeys Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // Registration Options Generation
  // ════════════════════════════════════════════════════════

  describe("generatePasskeyRegistrationOptions", () => {
    it("should query existing credentials for the user to exclude", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "test-challenge-abc",
      });

      await generatePasskeyRegistrationOptions(
        "user-1",
        "user@example.com",
        "Test User",
      );

      expect(mockPrisma.webAuthnCredential.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { credentialId: true, transports: true },
      });
    });

    it("should pass existing credentials as excludeCredentials to prevent re-registration", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([
        { credentialId: "cred-abc", transports: '["internal"]' },
        { credentialId: "cred-def", transports: null },
      ]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "challenge-123",
      });

      await generatePasskeyRegistrationOptions("user-1", "user@example.com");

      const callArgs = mockGenerateRegistrationOptions.mock.calls[0][0];
      expect(callArgs.excludeCredentials).toEqual([
        { id: "cred-abc", transports: ["internal"] },
        { id: "cred-def", transports: undefined },
      ]);
    });

    it("should use rpName, rpID, and user info from configuration", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "challenge-xyz",
      });

      await generatePasskeyRegistrationOptions(
        "user-2",
        "test@caelex.com",
        "Test User",
      );

      const callArgs = mockGenerateRegistrationOptions.mock.calls[0][0];
      expect(callArgs.rpName).toBe("Caelex");
      expect(callArgs.rpID).toBeDefined();
      expect(callArgs.userName).toBe("test@caelex.com");
      expect(callArgs.userDisplayName).toBe("Test User");
    });

    it("should use email as displayName when userName is not provided", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "challenge-no-name",
      });

      await generatePasskeyRegistrationOptions("user-3", "noname@caelex.com");

      const callArgs = mockGenerateRegistrationOptions.mock.calls[0][0];
      expect(callArgs.userDisplayName).toBe("noname@caelex.com");
    });

    it("should set attestationType to 'none' for broader compatibility", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "challenge-attest",
      });

      await generatePasskeyRegistrationOptions("user-4", "a@b.com");

      const callArgs = mockGenerateRegistrationOptions.mock.calls[0][0];
      expect(callArgs.attestationType).toBe("none");
    });

    it("should prefer platform authenticators (TouchID, FaceID)", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "challenge-auth-select",
      });

      await generatePasskeyRegistrationOptions("user-5", "a@b.com");

      const callArgs = mockGenerateRegistrationOptions.mock.calls[0][0];
      expect(callArgs.authenticatorSelection).toEqual({
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      });
    });

    it("should return the generated options object", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      const expectedOptions = {
        challenge: "challenge-return-test",
        rp: { name: "Caelex", id: "localhost" },
        user: { id: "user-6", name: "a@b.com", displayName: "a@b.com" },
      };
      mockGenerateRegistrationOptions.mockResolvedValue(expectedOptions);

      const result = await generatePasskeyRegistrationOptions(
        "user-6",
        "a@b.com",
      );

      expect(result.options).toBe(expectedOptions);
    });

    it("should store the challenge for later verification", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "stored-challenge-xyz",
      });

      await generatePasskeyRegistrationOptions("user-7", "a@b.com");

      // Verify the stored challenge is used by the verification step
      // We test this indirectly: immediately verifying should find the challenge
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3]),
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: "test-aaguid",
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({
        id: "new-cred",
      });

      const verifyResult = await verifyPasskeyRegistration(
        "user-7",
        makeRegistrationResponse() as never,
      );

      expect(verifyResult.success).toBe(true);
      // The verifyRegistrationResponse should have been called with the stored challenge
      expect(
        mockVerifyRegistrationResponse.mock.calls[0][0].expectedChallenge,
      ).toBe("stored-challenge-xyz");
    });
  });

  // ════════════════════════════════════════════════════════
  // Credential Verification (Registration)
  // ════════════════════════════════════════════════════════

  describe("verifyPasskeyRegistration", () => {
    beforeEach(async () => {
      // Pre-store a challenge for the test user
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "reg-challenge-for-verify",
      });
      await generatePasskeyRegistrationOptions("user-reg", "reg@test.com");
    });

    it("should return error when challenge has expired or is not found", async () => {
      // Use a user ID that has no stored challenge
      const result = await verifyPasskeyRegistration(
        "user-no-challenge",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Challenge expired or not found");
    });

    it("should call verifyRegistrationResponse with correct parameters", async () => {
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1, 2, 3]),
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
          },
          credentialDeviceType: "multiDevice",
          aaguid: "aaguid-123",
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({ id: "saved-1" });

      const response = makeRegistrationResponse();
      await verifyPasskeyRegistration("user-reg", response as never);

      expect(mockVerifyRegistrationResponse).toHaveBeenCalledWith({
        response,
        expectedChallenge: "reg-challenge-for-verify",
        expectedOrigin: expect.any(String),
        expectedRPID: expect.any(String),
      });
    });

    it("should return error when verifyRegistrationResponse throws", async () => {
      mockVerifyRegistrationResponse.mockRejectedValue(
        new Error("Invalid attestation"),
      );

      const result = await verifyPasskeyRegistration(
        "user-reg",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification failed");
    });

    it("should return error when verification is not verified", async () => {
      // Need a fresh challenge since previous test consumed it
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-1",
      });
      await generatePasskeyRegistrationOptions(
        "user-reg-unverified",
        "u@t.com",
      );

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: false,
        registrationInfo: null,
      });

      const result = await verifyPasskeyRegistration(
        "user-reg-unverified",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification failed");
    });

    it("should return error when registrationInfo is missing", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-2",
      });
      await generatePasskeyRegistrationOptions("user-reg-noinfo", "u@t.com");

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: null,
      });

      const result = await verifyPasskeyRegistration(
        "user-reg-noinfo",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification failed");
    });

    it("should return error when credential already exists", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-3",
      });
      await generatePasskeyRegistrationOptions("user-reg-dup", "u@t.com");

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([10, 20, 30]),
            publicKey: new Uint8Array([40, 50, 60]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: "aaguid-dup",
        },
      });
      // Credential already exists
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "existing-cred",
      });

      const result = await verifyPasskeyRegistration(
        "user-reg-dup",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Credential already registered");
    });

    it("should save the credential and return success when verification passes", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-4",
      });
      await generatePasskeyRegistrationOptions("user-reg-ok", "u@t.com");

      const credentialId = new Uint8Array([7, 8, 9]);
      const publicKey = new Uint8Array([10, 11, 12]);

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: credentialId,
            publicKey,
            counter: 5,
          },
          credentialDeviceType: "multiDevice",
          aaguid: "aaguid-ok",
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({
        id: "new-cred-id",
      });

      const response = makeRegistrationResponse();
      const result = await verifyPasskeyRegistration(
        "user-reg-ok",
        response as never,
        "My Laptop",
      );

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe("new-cred-id");

      expect(mockPrisma.webAuthnCredential.create).toHaveBeenCalledWith({
        data: {
          userId: "user-reg-ok",
          credentialId: Buffer.from(credentialId).toString("base64url"),
          publicKey: Buffer.from(publicKey).toString("base64"),
          counter: 5,
          deviceName: "My Laptop",
          deviceType: "multiDevice",
          aaguid: "aaguid-ok",
          transports: JSON.stringify(["internal"]),
        },
      });
    });

    it("should use default device name when not provided", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-5",
      });
      await generatePasskeyRegistrationOptions("user-reg-defname", "u@t.com");

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: null,
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({
        id: "cred-def-name",
      });

      await verifyPasskeyRegistration(
        "user-reg-defname",
        makeRegistrationResponse() as never,
      );

      const createData =
        mockPrisma.webAuthnCredential.create.mock.calls[0][0].data;
      expect(createData.deviceName).toBe("singleDevice authenticator");
    });

    it("should handle null transports in response", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "fresh-challenge-6",
      });
      await generatePasskeyRegistrationOptions("user-reg-notrans", "u@t.com");

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: null,
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({
        id: "cred-no-trans",
      });

      const response = makeRegistrationResponse();
      // Remove transports from the response
      delete (response.response as Record<string, unknown>).transports;

      await verifyPasskeyRegistration("user-reg-notrans", response as never);

      const createData =
        mockPrisma.webAuthnCredential.create.mock.calls[0][0].data;
      expect(createData.transports).toBeNull();
    });

    it("should clear the challenge after verification (even on failure)", async () => {
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "one-time-challenge",
      });
      await generatePasskeyRegistrationOptions("user-reg-clear", "u@t.com");

      mockVerifyRegistrationResponse.mockRejectedValue(new Error("fail"));

      await verifyPasskeyRegistration(
        "user-reg-clear",
        makeRegistrationResponse() as never,
      );

      // The challenge should be cleared, so a second attempt should fail with "expired"
      const result = await verifyPasskeyRegistration(
        "user-reg-clear",
        makeRegistrationResponse() as never,
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Challenge expired or not found");
    });
  });

  // ════════════════════════════════════════════════════════
  // Authentication Options Generation
  // ════════════════════════════════════════════════════════

  describe("generatePasskeyAuthenticationOptions", () => {
    it("should generate options without email (discoverable credential flow)", async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "auth-challenge-no-email",
        allowCredentials: [],
      });

      const result = await generatePasskeyAuthenticationOptions();

      expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith({
        rpID: expect.any(String),
        userVerification: "preferred",
        allowCredentials: undefined,
      });
      expect(result.options.challenge).toBe("auth-challenge-no-email");
      expect(result.userId).toBeUndefined();
    });

    it("should look up user credentials when email is provided", async () => {
      const mockUser = {
        id: "user-auth-1",
        email: "auth@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-1", transports: '["usb","ble"]' },
          { credentialId: "cred-2", transports: null },
        ],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "auth-challenge-with-email",
      });

      const result =
        await generatePasskeyAuthenticationOptions("auth@test.com");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "auth@test.com" },
        include: {
          webAuthnCredentials: {
            select: { credentialId: true, transports: true },
          },
        },
      });

      const callArgs = mockGenerateAuthenticationOptions.mock.calls[0][0];
      expect(callArgs.allowCredentials).toEqual([
        { id: "cred-1", transports: ["usb", "ble"] },
        { id: "cred-2", transports: undefined },
      ]);
      expect(result.userId).toBe("user-auth-1");
    });

    it("should pass undefined allowCredentials when user has no passkeys", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-no-creds",
        email: "nocreds@test.com",
        webAuthnCredentials: [],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "auth-challenge-no-creds",
      });

      const result =
        await generatePasskeyAuthenticationOptions("nocreds@test.com");

      const callArgs = mockGenerateAuthenticationOptions.mock.calls[0][0];
      expect(callArgs.allowCredentials).toBeUndefined();
      expect(result.userId).toBeUndefined();
    });

    it("should pass undefined allowCredentials when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "auth-challenge-no-user",
      });

      const result = await generatePasskeyAuthenticationOptions(
        "nonexistent@test.com",
      );

      const callArgs = mockGenerateAuthenticationOptions.mock.calls[0][0];
      expect(callArgs.allowCredentials).toBeUndefined();
      expect(result.userId).toBeUndefined();
    });

    it("should return the generated options", async () => {
      const expectedOptions = {
        challenge: "auth-options-result",
        timeout: 60000,
        rpId: "localhost",
      };
      mockGenerateAuthenticationOptions.mockResolvedValue(expectedOptions);

      const result = await generatePasskeyAuthenticationOptions();

      expect(result.options).toBe(expectedOptions);
    });
  });

  // ════════════════════════════════════════════════════════
  // Authentication Verification
  // ════════════════════════════════════════════════════════

  describe("verifyPasskeyAuthentication", () => {
    it("should return error when credential is not found", async () => {
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Credential not found");
    });

    it("should return error when expectedUserId does not match credential owner", async () => {
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-1",
        credentialId: "cred-id-1",
        userId: "user-a",
        publicKey: Buffer.from([1, 2, 3]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-a" },
      });

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse() as never,
        "user-b", // different user
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Credential does not belong to user");
    });

    it("should return error when challenge is expired or not found", async () => {
      // Advance time far enough to expire any lingering challenges from prior tests
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(realNow + 10 * 60 * 1000);

      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-2",
        credentialId: "cred-id-1",
        userId: "user-c-unique-no-challenge",
        publicKey: Buffer.from([1, 2, 3]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-c-unique-no-challenge" },
      });

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Challenge expired or not found");

      vi.restoreAllMocks();
    });

    it("should verify authentication and return success with userId", async () => {
      // First generate auth options to store a challenge
      const mockUser = {
        id: "user-auth-verify",
        email: "verify@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-verify", transports: '["internal"]' },
        ],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "auth-verify-challenge",
      });
      await generatePasskeyAuthenticationOptions("verify@test.com");

      // Now set up the credential lookup for authentication
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-verify",
        credentialId: "cred-verify",
        userId: "user-auth-verify",
        publicKey: Buffer.from([4, 5, 6]).toString("base64"),
        counter: 10,
        transports: '["internal"]',
        user: { id: "user-auth-verify" },
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 11 },
      });

      mockPrisma.webAuthnCredential.update.mockResolvedValue({});

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-verify") as never,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-auth-verify");
    });

    it("should update counter and lastUsedAt after successful authentication", async () => {
      // Store a challenge
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-counter",
        email: "counter@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-counter", transports: null },
        ],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "counter-challenge",
      });
      await generatePasskeyAuthenticationOptions("counter@test.com");

      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-counter",
        credentialId: "cred-counter",
        userId: "user-counter",
        publicKey: Buffer.from([1]).toString("base64"),
        counter: 42,
        transports: null,
        user: { id: "user-counter" },
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 43 },
      });
      mockPrisma.webAuthnCredential.update.mockResolvedValue({});

      await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-counter") as never,
      );

      expect(mockPrisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: { id: "db-cred-counter" },
        data: {
          counter: 43,
          lastUsedAt: expect.any(Date),
        },
      });
    });

    it("should return error when verifyAuthenticationResponse throws", async () => {
      // Store a challenge
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-auth-fail",
        email: "fail@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-auth-fail", transports: null },
        ],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "fail-challenge",
      });
      await generatePasskeyAuthenticationOptions("fail@test.com");

      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-fail",
        credentialId: "cred-auth-fail",
        userId: "user-auth-fail",
        publicKey: Buffer.from([1]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-auth-fail" },
      });

      mockVerifyAuthenticationResponse.mockRejectedValue(
        new Error("Invalid signature"),
      );

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-auth-fail") as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification failed");
    });

    it("should return error when verification.verified is false", async () => {
      // Store a challenge
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-not-verified",
        email: "noverify@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-not-verified", transports: null },
        ],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "noverify-challenge",
      });
      await generatePasskeyAuthenticationOptions("noverify@test.com");

      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-noverify",
        credentialId: "cred-not-verified",
        userId: "user-not-verified",
        publicKey: Buffer.from([1]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-not-verified" },
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: false,
      });

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-not-verified") as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Verification failed");
    });

    it("should pass the correct credential data to verifyAuthenticationResponse", async () => {
      // Store a challenge
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-cred-data",
        email: "creddata@test.com",
        webAuthnCredentials: [
          { credentialId: "cred-data", transports: '["ble","nfc"]' },
        ],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "creddata-challenge",
      });
      await generatePasskeyAuthenticationOptions("creddata@test.com");

      const storedPublicKey = Buffer.from([10, 20, 30]).toString("base64");
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-data",
        credentialId: "cred-data",
        userId: "user-cred-data",
        publicKey: storedPublicKey,
        counter: 99,
        transports: '["ble","nfc"]',
        user: { id: "user-cred-data" },
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 100 },
      });
      mockPrisma.webAuthnCredential.update.mockResolvedValue({});

      const authResponse = makeAuthenticationResponse("cred-data");
      await verifyPasskeyAuthentication(authResponse as never);

      const callArgs = mockVerifyAuthenticationResponse.mock.calls[0][0];
      expect(callArgs.response).toBe(authResponse);
      expect(callArgs.expectedChallenge).toBe("creddata-challenge");
      expect(callArgs.credential.id).toBe("cred-data");
      expect(callArgs.credential.counter).toBe(99);
      expect(callArgs.credential.transports).toEqual(["ble", "nfc"]);
      // Public key should be decoded from base64
      expect(callArgs.credential.publicKey).toBeInstanceOf(Uint8Array);
    });

    it("should clear the challenge after authentication (even on failure)", async () => {
      // Advance time to expire all lingering challenges from prior tests
      const baseTime = Date.now() + 20 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(baseTime);

      // Store a fresh challenge for this test
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-clear-auth",
        email: "clear@test.com",
        webAuthnCredentials: [{ credentialId: "cred-clear", transports: null }],
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({
        challenge: "clear-auth-challenge",
      });
      await generatePasskeyAuthenticationOptions("clear@test.com");

      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-clear",
        credentialId: "cred-clear",
        userId: "user-clear-auth",
        publicKey: Buffer.from([1]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-clear-auth" },
      });

      mockVerifyAuthenticationResponse.mockRejectedValue(new Error("fail"));

      await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-clear") as never,
      );

      // Second attempt should fail with challenge expired (it was cleared in the finally block)
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue({
        id: "db-cred-clear",
        credentialId: "cred-clear",
        userId: "user-clear-auth",
        publicKey: Buffer.from([1]).toString("base64"),
        counter: 0,
        transports: null,
        user: { id: "user-clear-auth" },
      });

      const result = await verifyPasskeyAuthentication(
        makeAuthenticationResponse("cred-clear") as never,
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Challenge expired or not found");

      vi.restoreAllMocks();
    });
  });

  // ════════════════════════════════════════════════════════
  // Challenge Management
  // ════════════════════════════════════════════════════════

  describe("challenge management", () => {
    it("should expire challenges after 5 minutes", async () => {
      // Store a challenge
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "expiring-challenge",
      });

      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);
      await generatePasskeyRegistrationOptions("user-expire", "e@t.com");

      // Advance time past 5 minutes
      vi.spyOn(Date, "now").mockReturnValue(now + 5 * 60 * 1000 + 1);

      const result = await verifyPasskeyRegistration(
        "user-expire",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Challenge expired or not found");

      vi.restoreAllMocks();
    });

    it("should allow challenge within the 5-minute window", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "valid-window-challenge",
      });

      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);
      await generatePasskeyRegistrationOptions("user-valid-time", "v@t.com");

      // Advance time to just under 5 minutes
      vi.spyOn(Date, "now").mockReturnValue(now + 4 * 60 * 1000);

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: null,
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({
        id: "cred-valid",
      });

      const result = await verifyPasskeyRegistration(
        "user-valid-time",
        makeRegistrationResponse() as never,
      );

      expect(result.success).toBe(true);

      vi.restoreAllMocks();
    });

    it("should overwrite previous challenge when a new one is generated for the same user", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);

      // Generate first challenge
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "first-challenge",
      });
      await generatePasskeyRegistrationOptions("user-overwrite", "o@t.com");

      // Generate second challenge (overwrites the first)
      mockGenerateRegistrationOptions.mockResolvedValue({
        challenge: "second-challenge",
      });
      await generatePasskeyRegistrationOptions("user-overwrite", "o@t.com");

      // Verify should use the second challenge
      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: new Uint8Array([1]),
            publicKey: new Uint8Array([2]),
            counter: 0,
          },
          credentialDeviceType: "singleDevice",
          aaguid: null,
        },
      });
      mockPrisma.webAuthnCredential.findUnique.mockResolvedValue(null);
      mockPrisma.webAuthnCredential.create.mockResolvedValue({ id: "cred-ow" });

      await verifyPasskeyRegistration(
        "user-overwrite",
        makeRegistrationResponse() as never,
      );

      expect(
        mockVerifyRegistrationResponse.mock.calls[0][0].expectedChallenge,
      ).toBe("second-challenge");
    });
  });

  // ════════════════════════════════════════════════════════
  // User Passkey Management (CRUD)
  // ════════════════════════════════════════════════════════

  describe("getUserPasskeys", () => {
    it("should return passkeys for the user with selected fields", async () => {
      const mockPasskeys = [
        {
          id: "pk-1",
          deviceName: "MacBook Pro",
          deviceType: "singleDevice",
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
        {
          id: "pk-2",
          deviceName: "iPhone 15",
          deviceType: "multiDevice",
          createdAt: new Date(),
          lastUsedAt: null,
        },
      ];
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue(mockPasskeys);

      const result = await getUserPasskeys("user-pk-list");

      expect(mockPrisma.webAuthnCredential.findMany).toHaveBeenCalledWith({
        where: { userId: "user-pk-list" },
        select: {
          id: true,
          deviceName: true,
          deviceType: true,
          createdAt: true,
          lastUsedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(mockPasskeys);
    });

    it("should return empty array when user has no passkeys", async () => {
      mockPrisma.webAuthnCredential.findMany.mockResolvedValue([]);

      const result = await getUserPasskeys("user-no-pk");
      expect(result).toEqual([]);
    });
  });

  describe("deletePasskey", () => {
    it("should delete the passkey and return true when found", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue({
        id: "cred-to-delete",
        userId: "user-del",
      });
      mockPrisma.webAuthnCredential.delete.mockResolvedValue({});

      const result = await deletePasskey("user-del", "cred-to-delete");

      expect(result).toBe(true);
      expect(mockPrisma.webAuthnCredential.findFirst).toHaveBeenCalledWith({
        where: { id: "cred-to-delete", userId: "user-del" },
      });
      expect(mockPrisma.webAuthnCredential.delete).toHaveBeenCalledWith({
        where: { id: "cred-to-delete" },
      });
    });

    it("should return false when credential is not found", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(null);

      const result = await deletePasskey("user-del", "nonexistent");

      expect(result).toBe(false);
      expect(mockPrisma.webAuthnCredential.delete).not.toHaveBeenCalled();
    });

    it("should not delete credential belonging to a different user", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(null);

      const result = await deletePasskey("wrong-user", "cred-123");

      expect(result).toBe(false);
      expect(mockPrisma.webAuthnCredential.delete).not.toHaveBeenCalled();
    });
  });

  describe("renamePasskey", () => {
    it("should rename the passkey and return true when found", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue({
        id: "cred-to-rename",
        userId: "user-ren",
      });
      mockPrisma.webAuthnCredential.update.mockResolvedValue({});

      const result = await renamePasskey(
        "user-ren",
        "cred-to-rename",
        "My New Device Name",
      );

      expect(result).toBe(true);
      expect(mockPrisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: { id: "cred-to-rename" },
        data: { deviceName: "My New Device Name" },
      });
    });

    it("should return false when credential is not found", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(null);

      const result = await renamePasskey("user-ren", "nonexistent", "Name");

      expect(result).toBe(false);
      expect(mockPrisma.webAuthnCredential.update).not.toHaveBeenCalled();
    });

    it("should verify ownership via userId before renaming", async () => {
      mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(null);

      await renamePasskey("wrong-user", "cred-123", "Hacked Name");

      expect(mockPrisma.webAuthnCredential.findFirst).toHaveBeenCalledWith({
        where: { id: "cred-123", userId: "wrong-user" },
      });
      expect(mockPrisma.webAuthnCredential.update).not.toHaveBeenCalled();
    });
  });

  describe("hasPasskeys", () => {
    it("should return true when user has at least one passkey", async () => {
      mockPrisma.webAuthnCredential.count.mockResolvedValue(3);

      const result = await hasPasskeys("user-has-pk");

      expect(result).toBe(true);
      expect(mockPrisma.webAuthnCredential.count).toHaveBeenCalledWith({
        where: { userId: "user-has-pk" },
      });
    });

    it("should return false when user has no passkeys", async () => {
      mockPrisma.webAuthnCredential.count.mockResolvedValue(0);

      const result = await hasPasskeys("user-no-pk");

      expect(result).toBe(false);
    });

    it("should return true when count is exactly 1", async () => {
      mockPrisma.webAuthnCredential.count.mockResolvedValue(1);

      const result = await hasPasskeys("user-one-pk");

      expect(result).toBe(true);
    });
  });
});
