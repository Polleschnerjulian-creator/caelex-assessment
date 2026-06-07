/**
 * Tests for account-security.server.ts
 *
 * Mocks @/lib/prisma and bcryptjs so no real database or crypto work
 * happens. Follows the same pattern as preferences.server.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Hoist mock fns so they're available when vi.mock factories run.
const { mockUserFindUnique, mockUserUpdate } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    loginEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock bcryptjs so tests run without actual hashing latency.
const { mockCompare, mockHash } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));

import {
  changePassword,
  isCredentialsAccount,
} from "./account-security.server";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe("changePassword", () => {
  it("returns field error when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await changePassword("u1", "old", "newpass1");

    expect(result).toEqual({
      success: false,
      field: "general",
      message: "Benutzer nicht gefunden.",
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns general error for SSO/OAuth account (no password)", async () => {
    mockUserFindUnique.mockResolvedValue({ password: null });

    const result = await changePassword("u1", "any", "newpass1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.field).toBe("general");
    }
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns current-field error when current password is wrong", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "$2b$12$hashed" });
    // First compare: current vs stored → false (wrong)
    mockCompare.mockResolvedValueOnce(false);

    const result = await changePassword("u1", "wrong", "newpass1");

    expect(result).toEqual({
      success: false,
      field: "current",
      message: "Das aktuelle Passwort ist falsch.",
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns new-field error when new password is too short", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "$2b$12$hashed" });
    // current password check → true
    mockCompare.mockResolvedValueOnce(true);

    const result = await changePassword("u1", "correct", "short");

    expect(result).toEqual({
      success: false,
      field: "new",
      message: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns new-field error when new password equals current", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "$2b$12$hashed" });
    // current password check → true
    mockCompare.mockResolvedValueOnce(true);
    // same-as-current check → true
    mockCompare.mockResolvedValueOnce(true);

    const result = await changePassword("u1", "correctpw", "correctpw");

    expect(result).toEqual({
      success: false,
      field: "new",
      message: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("hashes new password with cost 12 and calls user.update on success", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "$2b$12$hashed" });
    // current check → true; same-as-current check → false
    mockCompare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockHash.mockResolvedValue("$2b$12$newhash");
    mockUserUpdate.mockResolvedValue({});

    const result = await changePassword("u1", "currentpw", "newsecure1");

    expect(result).toEqual({ success: true });
    expect(mockHash).toHaveBeenCalledWith("newsecure1", 12);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "$2b$12$newhash" },
    });
  });
});

// ─── isCredentialsAccount ─────────────────────────────────────────────────────

describe("isCredentialsAccount", () => {
  it("returns true when user has a password hash", async () => {
    mockUserFindUnique.mockResolvedValue({ password: "$2b$12$hashed" });
    expect(await isCredentialsAccount("u1")).toBe(true);
  });

  it("returns false when user has no password (SSO/OAuth)", async () => {
    mockUserFindUnique.mockResolvedValue({ password: null });
    expect(await isCredentialsAccount("u1")).toBe(false);
  });

  it("returns false when user is not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    expect(await isCredentialsAccount("u1")).toBe(false);
  });
});
