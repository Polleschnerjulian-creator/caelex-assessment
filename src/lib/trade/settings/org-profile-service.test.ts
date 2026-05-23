/**
 * Tests for src/lib/trade/settings/org-profile-service.ts — Caelex
 * Trade Settings (Sprint T-Settings).
 *
 * Coverage (8 cases):
 *   1. getProfile returns null when no row exists
 *   2. getProfile decrypts BAFA email, EORI, DUNS+4 round-trip
 *   3. getProfile parses preferredRegimesJson into typed array
 *   4. ensureProfile upserts with no payload (lazy create)
 *   5. upsertProfile encrypts sensitive fields before writing
 *   6. upsertProfile clears encrypted columns on empty-string patch
 *   7. upsertProfile skips sensitive columns when patch omits them
 *   8. upsertProfile filters & dedupes preferredRegimes whitelist
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpsert, mockEncrypt, mockDecrypt } = vi.hoisted(
  () => ({
    mockFindUnique: vi.fn(),
    mockUpsert: vi.fn(),
    mockEncrypt: vi.fn(),
    mockDecrypt: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOrgProfile: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

import {
  getProfile,
  ensureProfile,
  upsertProfile,
  isTradeRegime,
} from "./org-profile-service";

beforeEach(() => {
  vi.clearAllMocks();
  mockEncrypt.mockImplementation(
    async (plaintext: string) => `ENC:${plaintext}`,
  );
  mockDecrypt.mockImplementation(async (ciphertext: string) =>
    ciphertext.replace(/^ENC:/, ""),
  );
});

const baseRow = {
  id: "prof_1",
  organizationId: "org_1",
  bafaContactName: null,
  bafaContactRole: null,
  bafaContactPhone: null,
  bafaContactEmailEnc: null,
  eoriNumberEnc: null,
  dunsPlus4Enc: null,
  primaryExportJurisdiction: null,
  preferredRegimesJson: null,
  createdAt: new Date("2026-05-23T00:00:00Z"),
  updatedAt: new Date("2026-05-23T00:00:00Z"),
};

describe("getProfile", () => {
  it("returns null when no row exists for the org", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getProfile("org_missing");
    expect(result).toBeNull();
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it("decrypts BAFA email, EORI, DUNS+4 — caller sees plaintext", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      bafaContactEmailEnc: "ENC:bafa@example.com",
      eoriNumberEnc: "ENC:DE123456789012345",
      dunsPlus4Enc: "ENC:1234567890123",
    });

    const result = await getProfile("org_1");

    expect(result?.bafaContactEmail).toBe("bafa@example.com");
    expect(result?.eoriNumber).toBe("DE123456789012345");
    expect(result?.dunsPlus4).toBe("1234567890123");
    // Ciphertext columns must not surface on the view.
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "bafaContactEmailEnc",
    );
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "preferredRegimesJson",
    );
  });

  it("parses preferredRegimesJson into a typed array", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      preferredRegimesJson: JSON.stringify(["BIS", "BAFA"]),
    });

    const result = await getProfile("org_1");

    expect(result?.preferredRegimes).toEqual(["BIS", "BAFA"]);
  });
});

describe("ensureProfile", () => {
  it("upserts an empty row when none exists — lazy-create", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    const result = await ensureProfile("org_1");

    expect(result.organizationId).toBe("org_1");
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      create: { organizationId: "org_1" },
      update: {},
    });
  });
});

describe("upsertProfile", () => {
  it("encrypts sensitive fields before the DB write", async () => {
    mockUpsert.mockResolvedValue({
      ...baseRow,
      bafaContactEmailEnc: "ENC:bafa@example.com",
      eoriNumberEnc: "ENC:DE99999999999",
      dunsPlus4Enc: "ENC:1234567890123",
    });

    await upsertProfile("org_1", {
      bafaContactEmail: "bafa@example.com",
      eoriNumber: "DE99999999999",
      dunsPlus4: "1234567890123",
      primaryExportJurisdiction: "DE",
    });

    expect(mockEncrypt).toHaveBeenCalledWith("bafa@example.com");
    expect(mockEncrypt).toHaveBeenCalledWith("DE99999999999");
    expect(mockEncrypt).toHaveBeenCalledWith("1234567890123");

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.bafaContactEmailEnc).toBe("ENC:bafa@example.com");
    expect(call.create.eoriNumberEnc).toBe("ENC:DE99999999999");
    expect(call.create.dunsPlus4Enc).toBe("ENC:1234567890123");
    expect(call.create.primaryExportJurisdiction).toBe("DE");
    // Plain-field counterparts must never reach Prisma.
    expect(call.create).not.toHaveProperty("bafaContactEmail");
    expect(call.create).not.toHaveProperty("eoriNumber");
    expect(call.create).not.toHaveProperty("dunsPlus4");
  });

  it("clears encrypted columns to NULL when patch passes empty string", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertProfile("org_1", {
      bafaContactEmail: "",
      eoriNumber: "",
      dunsPlus4: "",
    });

    expect(mockEncrypt).not.toHaveBeenCalled();
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.bafaContactEmailEnc).toBeNull();
    expect(call.create.eoriNumberEnc).toBeNull();
    expect(call.create.dunsPlus4Enc).toBeNull();
    expect(call.update.bafaContactEmailEnc).toBeNull();
  });

  it("skips sensitive columns entirely when the patch omits them", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertProfile("org_1", { primaryExportJurisdiction: "FR" });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.primaryExportJurisdiction).toBe("FR");
    expect(call.create).not.toHaveProperty("bafaContactEmailEnc");
    expect(call.create).not.toHaveProperty("eoriNumberEnc");
    expect(call.create).not.toHaveProperty("dunsPlus4Enc");
    expect(call.create).not.toHaveProperty("preferredRegimesJson");
  });

  it("filters & dedupes preferredRegimes against the whitelist", async () => {
    mockUpsert.mockResolvedValue(baseRow);

    await upsertProfile("org_1", {
      preferredRegimes: [
        "BIS",
        "BAFA",
        "BIS", // duplicate
        "UNKNOWN" as never, // not in whitelist — must be filtered
      ],
    });

    const call = mockUpsert.mock.calls[0][0];
    const persisted = JSON.parse(call.create.preferredRegimesJson);
    expect(persisted).toEqual(["BIS", "BAFA"]);
  });
});

describe("isTradeRegime", () => {
  it("guards untrusted scope strings against the whitelist", () => {
    expect(isTradeRegime("BIS")).toBe(true);
    expect(isTradeRegime("BAFA")).toBe(true);
    expect(isTradeRegime("DDTC")).toBe(true);
    expect(isTradeRegime("ECJU")).toBe(true);
    expect(isTradeRegime("UNKNOWN")).toBe(false);
    expect(isTradeRegime("")).toBe(false);
  });
});
