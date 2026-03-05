import { describe, it, expect, vi, beforeEach } from "vitest";
import { rotateIssuerKey, listAllIssuerKeys } from "./key-rotation";

// Mock dependencies
vi.mock("./issuer-keys", () => ({
  generateIssuerKeyPair: vi.fn(),
}));

vi.mock("../utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import { generateIssuerKeyPair } from "./issuer-keys";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    verityIssuerKey: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

// ─── rotateIssuerKey ────────────────────────────────────────────────────────

describe("rotateIssuerKey", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.mocked(generateIssuerKeyPair).mockResolvedValue({
      keyId: "verity-2026-03-05",
      publicKeyHex: "abcdef1234567890",
      encryptedPrivateKeyHex: "iv:tag:ciphertext",
    });

    (
      mockPrisma.verityIssuerKey as unknown as {
        create: ReturnType<typeof vi.fn>;
      }
    ).create.mockResolvedValue({
      keyId: "verity-2026-03-05",
      publicKeyHex: "abcdef1234567890",
      encryptedPrivKey: "iv:tag:ciphertext",
      algorithm: "Ed25519",
      active: true,
    });
  });

  it("deactivates current active keys before creating new one", async () => {
    await rotateIssuerKey(mockPrisma);

    expect(
      (
        mockPrisma.verityIssuerKey as unknown as {
          updateMany: ReturnType<typeof vi.fn>;
        }
      ).updateMany,
    ).toHaveBeenCalledWith({
      where: { active: true },
      data: { active: false, rotatedAt: expect.any(Date) },
    });
  });

  it("generates a new issuer key pair", async () => {
    await rotateIssuerKey(mockPrisma);

    expect(generateIssuerKeyPair).toHaveBeenCalledOnce();
  });

  it("stores the new key in the database", async () => {
    await rotateIssuerKey(mockPrisma);

    expect(
      (
        mockPrisma.verityIssuerKey as unknown as {
          create: ReturnType<typeof vi.fn>;
        }
      ).create,
    ).toHaveBeenCalledWith({
      data: {
        keyId: "verity-2026-03-05",
        publicKeyHex: "abcdef1234567890",
        encryptedPrivKey: "iv:tag:ciphertext",
        algorithm: "Ed25519",
        active: true,
      },
    });
  });

  it("returns keyId and publicKeyHex from the new key", async () => {
    const result = await rotateIssuerKey(mockPrisma);

    expect(result).toEqual({
      keyId: "verity-2026-03-05",
      publicKeyHex: "abcdef1234567890",
    });
  });

  it("calls operations in correct order: deactivate, generate, create", async () => {
    const callOrder: string[] = [];

    (
      mockPrisma.verityIssuerKey as unknown as {
        updateMany: ReturnType<typeof vi.fn>;
      }
    ).updateMany.mockImplementation(async () => {
      callOrder.push("updateMany");
      return { count: 1 };
    });

    vi.mocked(generateIssuerKeyPair).mockImplementation(async () => {
      callOrder.push("generateKeyPair");
      return {
        keyId: "verity-2026-03-05",
        publicKeyHex: "abcdef1234567890",
        encryptedPrivateKeyHex: "iv:tag:ciphertext",
      };
    });

    (
      mockPrisma.verityIssuerKey as unknown as {
        create: ReturnType<typeof vi.fn>;
      }
    ).create.mockImplementation(async () => {
      callOrder.push("create");
      return {
        keyId: "verity-2026-03-05",
        publicKeyHex: "abcdef1234567890",
        encryptedPrivKey: "iv:tag:ciphertext",
        algorithm: "Ed25519",
        active: true,
      };
    });

    await rotateIssuerKey(mockPrisma);

    expect(callOrder).toEqual(["updateMany", "generateKeyPair", "create"]);
  });
});

// ─── listAllIssuerKeys ──────────────────────────────────────────────────────

describe("listAllIssuerKeys", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("queries keys ordered by createdAt desc", async () => {
    (
      mockPrisma.verityIssuerKey as unknown as {
        findMany: ReturnType<typeof vi.fn>;
      }
    ).findMany.mockResolvedValue([]);

    await listAllIssuerKeys(mockPrisma);

    expect(
      (
        mockPrisma.verityIssuerKey as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany,
    ).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no keys exist", async () => {
    (
      mockPrisma.verityIssuerKey as unknown as {
        findMany: ReturnType<typeof vi.fn>;
      }
    ).findMany.mockResolvedValue([]);

    const result = await listAllIssuerKeys(mockPrisma);
    expect(result).toEqual([]);
  });

  it("maps database keys to public format", async () => {
    const createdAt = new Date("2026-03-05T10:00:00Z");
    (
      mockPrisma.verityIssuerKey as unknown as {
        findMany: ReturnType<typeof vi.fn>;
      }
    ).findMany.mockResolvedValue([
      {
        keyId: "verity-2026-03-05",
        publicKeyHex: "abcdef1234567890",
        algorithm: "Ed25519",
        active: true,
        createdAt,
      },
    ]);

    const result = await listAllIssuerKeys(mockPrisma);

    expect(result).toEqual([
      {
        key_id: "verity-2026-03-05",
        public_key: "abcdef1234567890",
        algorithm: "Ed25519",
        active: true,
        active_since: "2026-03-05T10:00:00.000Z",
      },
    ]);
  });

  it("maps multiple keys including active and rotated", async () => {
    const activeCreated = new Date("2026-03-05T10:00:00Z");
    const rotatedCreated = new Date("2026-02-01T08:00:00Z");

    (
      mockPrisma.verityIssuerKey as unknown as {
        findMany: ReturnType<typeof vi.fn>;
      }
    ).findMany.mockResolvedValue([
      {
        keyId: "verity-2026-03-05",
        publicKeyHex: "newkey123",
        algorithm: "Ed25519",
        active: true,
        createdAt: activeCreated,
      },
      {
        keyId: "verity-2026-02-01",
        publicKeyHex: "oldkey456",
        algorithm: "Ed25519",
        active: false,
        createdAt: rotatedCreated,
      },
    ]);

    const result = await listAllIssuerKeys(mockPrisma);

    expect(result).toHaveLength(2);
    expect(result[0].active).toBe(true);
    expect(result[0].key_id).toBe("verity-2026-03-05");
    expect(result[1].active).toBe(false);
    expect(result[1].key_id).toBe("verity-2026-02-01");
    expect(result[1].active_since).toBe("2026-02-01T08:00:00.000Z");
  });
});
