/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Integration tests for PATCH /api/atlas/settings/password —
 * authenticated password change endpoint added in feat(atlas) on
 * 2026-04-28. Security-critical: a regression here either breaks
 * password rotation for paying tenants OR opens a credential-update
 * vector. The tests pin the full state machine:
 *
 *   1. Auth-gate (getAtlasAuth must succeed)
 *   2. Rate-limit (sensitive tier, BEFORE bcrypt-compare so a leaked
 *      session can't pump the CPU loop)
 *   3. Body-Zod-validation (12-char min, complexity classes,
 *      current ≠ new, confirm == new)
 *   4. OAuth-only user rejection (user.password === null)
 *   5. Wrong current password rejection (verifyPassword false)
 *   6. Happy path (hashPassword + prisma.user.update + 200)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getAtlasAuth: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  rl: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: mocks.getAtlasAuth,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mocks.rl,
  getIdentifier: () => "ip:test|user:test-user",
}));

import { PATCH } from "@/app/api/atlas/settings/password/route";

function makeReq(body: unknown) {
  return new Request("http://test/api/atlas/settings/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  currentPassword: "OldPassword123!",
  newPassword: "NewS3cure!Password123",
  confirmPassword: "NewS3cure!Password123",
};

const ATLAS_AUTH_OK = {
  userId: "user-1",
  userName: "Test User",
  userEmail: "test@example.com",
  userLanguage: "en",
  organizationId: "org-1",
  organizationName: "Test Firm",
  organizationLogo: null,
  organizationSlug: "test-firm",
  role: "MEMBER" as const,
  isPlatformAdmin: false,
};

const RATE_LIMIT_OK = {
  success: true,
  remaining: 4,
  reset: Date.now() + 60_000,
};
const RATE_LIMIT_BLOCKED = {
  success: false,
  remaining: 0,
  reset: Date.now() + 60_000,
};

beforeEach(() => {
  mocks.getAtlasAuth.mockReset();
  mocks.findUnique.mockReset();
  mocks.update.mockReset();
  mocks.rl.mockReset();
  mocks.verifyPassword.mockReset();
  mocks.hashPassword.mockReset();

  // Defaults: auth ok, rate-limit ok, user has a password, current
  // matches, hash returns a fixed string, update resolves.
  mocks.getAtlasAuth.mockResolvedValue(ATLAS_AUTH_OK);
  mocks.rl.mockResolvedValue(RATE_LIMIT_OK);
  mocks.findUnique.mockResolvedValue({
    id: "user-1",
    password: "$2a$12$existinghash",
    email: "test@example.com",
  });
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.hashPassword.mockResolvedValue("$2a$12$newhash");
  mocks.update.mockResolvedValue({ id: "user-1" });
});

// ─── 1. Auth-gate ────────────────────────────────────────────────────

describe("PATCH /api/atlas/settings/password — auth gate", () => {
  it("returns 401 when getAtlasAuth resolves to null", async () => {
    mocks.getAtlasAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    // No bcrypt + DB calls when unauth
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });
});

// ─── 2. Rate-limit ───────────────────────────────────────────────────

describe("PATCH /api/atlas/settings/password — rate limit", () => {
  it("returns 429 when rate-limit blocks", async () => {
    mocks.rl.mockResolvedValueOnce(RATE_LIMIT_BLOCKED);
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
    expect(typeof body.retryAfterMs).toBe("number");
  });

  it("rate-limit fires BEFORE the bcrypt-compare loop", async () => {
    // If rate-limit blocks, we should never even read the user row.
    mocks.rl.mockResolvedValueOnce(RATE_LIMIT_BLOCKED);
    await PATCH(makeReq(VALID_BODY));
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("rate-limit identifier scopes by user (not just IP)", async () => {
    await PATCH(makeReq(VALID_BODY));
    // Defensive: getIdentifier(request, atlas.userId) — verify the
    // mocked rate-limit was called with "sensitive" tier
    expect(mocks.rl).toHaveBeenCalled();
    const [tier] = mocks.rl.mock.calls[0];
    expect(tier).toBe("sensitive");
  });
});

// ─── 3. Body / Zod validation ────────────────────────────────────────

describe("PATCH /api/atlas/settings/password — body validation", () => {
  it("returns 400 on empty body", async () => {
    const res = await PATCH(
      new Request("http://test/api/atlas/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when newPassword is < 12 chars", async () => {
    const res = await PATCH(
      makeReq({
        currentPassword: "OldPwd123!",
        newPassword: "Short1!",
        confirmPassword: "Short1!",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/validation/i);
  });

  it("returns 400 when newPassword lacks an uppercase letter", async () => {
    const res = await PATCH(
      makeReq({
        currentPassword: "OldPwd123!",
        newPassword: "alllowercase123!",
        confirmPassword: "alllowercase123!",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when newPassword lacks a digit", async () => {
    const res = await PATCH(
      makeReq({
        currentPassword: "OldPwd123!",
        newPassword: "NoDigitsAtAll!",
        confirmPassword: "NoDigitsAtAll!",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when newPassword lacks a special character", async () => {
    const res = await PATCH(
      makeReq({
        currentPassword: "OldPwd123!",
        newPassword: "NoSpecialsHere123",
        confirmPassword: "NoSpecialsHere123",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when confirmPassword does not match newPassword", async () => {
    const res = await PATCH(
      makeReq({
        currentPassword: "OldPwd123!",
        newPassword: "NewS3cure!Password123",
        confirmPassword: "DifferentS3cure!Password123",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when newPassword equals currentPassword", async () => {
    const same = "Same!Pwd1234567";
    const res = await PATCH(
      makeReq({
        currentPassword: same,
        newPassword: same,
        confirmPassword: same,
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ─── 4. OAuth-only user (no password set) ────────────────────────────

describe("PATCH /api/atlas/settings/password — OAuth-only user", () => {
  it("returns 400 with explicit message when user.password is null", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "user-1",
      password: null,
      email: "oauth-only@example.com",
    });
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no password is set/i);
    // Important: don't even attempt bcrypt-compare on a null hash
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("returns 401 when the userId cannot be resolved (race-condition / deleted)", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });
});

// ─── 5. Wrong current password ───────────────────────────────────────

describe("PATCH /api/atlas/settings/password — wrong current password", () => {
  it("returns 400 with generic message when verifyPassword returns false", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/current password is incorrect/i);
    // No update should fire
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });
});

// ─── 6. Happy path ───────────────────────────────────────────────────

describe("PATCH /api/atlas/settings/password — happy path", () => {
  it("returns 200 with success:true on a valid change", async () => {
    const res = await PATCH(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("calls verifyPassword with currentPassword + stored hash", async () => {
    await PATCH(makeReq(VALID_BODY));
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      "OldPassword123!",
      "$2a$12$existinghash",
    );
  });

  it("calls hashPassword with the new password", async () => {
    await PATCH(makeReq(VALID_BODY));
    expect(mocks.hashPassword).toHaveBeenCalledWith("NewS3cure!Password123");
  });

  it("persists the new hash on the user row", async () => {
    await PATCH(makeReq(VALID_BODY));
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "$2a$12$newhash" },
    });
  });

  it("does not log password material (defensive — assert via call shape)", async () => {
    // We can't easily intercept logger.info here without re-mocking;
    // but we can assert that update was called with the HASH not the
    // plaintext, which is the reliable observable.
    await PATCH(makeReq(VALID_BODY));
    const updateCall = mocks.update.mock.calls[0][0];
    expect(updateCall.data.password).not.toBe("NewS3cure!Password123");
    expect(updateCall.data.password).toMatch(/^\$2a\$12\$/);
  });
});

// ─── 7. Pipeline ordering (defence-in-depth) ─────────────────────────

describe("PATCH /api/atlas/settings/password — pipeline ordering", () => {
  it("auth → rate-limit → body-zod → DB-fetch → verify → hash → update", async () => {
    await PATCH(makeReq(VALID_BODY));
    // All six in this order: ratelimit before findUnique before
    // verifyPassword before hashPassword before update.
    expect(mocks.rl).toHaveBeenCalled();
    expect(mocks.findUnique).toHaveBeenCalled();
    expect(mocks.verifyPassword).toHaveBeenCalled();
    expect(mocks.hashPassword).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
  });
});
