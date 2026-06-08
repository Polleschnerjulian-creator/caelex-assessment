/**
 * G7 — erasure cascade test for DELETE /api/user/delete.
 *
 * The Scholar tables (ScholarUserPreferences / ScholarSearchHistory /
 * ScholarBookmark / ScholarReadingList(+Item)) are intentionally decoupled
 * from the User model (bare `userId String`, no FK/relation), so the
 * `tx.user.delete()` cascade CANNOT reach them. This test verifies the delete
 * route explicitly erases every Scholar table inside its transaction, so an
 * account deletion does not orphan personal data (Art. 17 GDPR).
 *
 * All external deps (auth, cookies, CSRF, bcrypt, prisma) are mocked so the
 * route handler runs without a DB or a real request.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockAuth,
  mockCookiesGet,
  mockValidateCsrf,
  mockUserFindUnique,
  mockTransaction,
  // tx.* delete spies
  txAuditUpdateMany,
  txAnalyticsUpdateMany,
  txAcquisitionUpdateMany,
  txReadingListItemDeleteMany,
  txReadingListDeleteMany,
  txBookmarkDeleteMany,
  txSearchHistoryDeleteMany,
  txPreferencesDeleteMany,
  txLoginAttemptDeleteMany,
  txOrgMemberFindMany,
  txOrgDeleteMany,
  txUserDelete,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCookiesGet: vi.fn(),
  mockValidateCsrf: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  txAuditUpdateMany: vi.fn(),
  txAnalyticsUpdateMany: vi.fn(),
  txAcquisitionUpdateMany: vi.fn(),
  txReadingListItemDeleteMany: vi.fn(),
  txReadingListDeleteMany: vi.fn(),
  txBookmarkDeleteMany: vi.fn(),
  txSearchHistoryDeleteMany: vi.fn(),
  txPreferencesDeleteMany: vi.fn(),
  txLoginAttemptDeleteMany: vi.fn(),
  txOrgMemberFindMany: vi.fn(),
  txOrgDeleteMany: vi.fn(),
  txUserDelete: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookiesGet }),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/csrf", () => ({
  CSRF_COOKIE_NAME: "csrf-token",
  CSRF_HEADER_NAME: "x-csrf-token",
  validateCsrfToken: mockValidateCsrf,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  maskEmail: (e: string) => e,
}));

vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

// The transaction callback receives a `tx` whose methods are our spies.
const tx = {
  auditLog: { updateMany: txAuditUpdateMany },
  analyticsEvent: { updateMany: txAnalyticsUpdateMany },
  acquisitionEvent: { updateMany: txAcquisitionUpdateMany },
  scholarReadingListItem: { deleteMany: txReadingListItemDeleteMany },
  scholarReadingList: { deleteMany: txReadingListDeleteMany },
  scholarBookmark: { deleteMany: txBookmarkDeleteMany },
  scholarSearchHistory: { deleteMany: txSearchHistoryDeleteMany },
  scholarUserPreferences: { deleteMany: txPreferencesDeleteMany },
  loginAttempt: { deleteMany: txLoginAttemptDeleteMany },
  organizationMember: { findMany: txOrgMemberFindMany },
  organization: { deleteMany: txOrgDeleteMany },
  user: { delete: txUserDelete },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    $transaction: mockTransaction,
  },
}));

import { DELETE } from "@/app/api/user/delete/route";

function makeRequest() {
  return {
    headers: { get: () => "csrf-header-token" },
    json: async () => ({ confirmation: "DELETE MY ACCOUNT" }),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookiesGet.mockReturnValue({ value: "csrf-cookie-token" });
  mockValidateCsrf.mockReturnValue(true);
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  // OAuth-only user (no password) → skips bcrypt branch.
  mockUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "ada@example.com",
    password: null,
    accounts: [{ provider: "google" }],
    organizationMemberships: [],
  });
  // eraseAnalyticsForUser reads `.count` off these updateMany results.
  txAnalyticsUpdateMany.mockResolvedValue({ count: 0 });
  txAcquisitionUpdateMany.mockResolvedValue({ count: 0 });
  // Run the transaction callback against our mock tx.
  mockTransaction.mockImplementation(async (cb: (t: typeof tx) => unknown) => {
    txOrgMemberFindMany.mockResolvedValue([]);
    return cb(tx);
  });
});

describe("DELETE /api/user/delete — Scholar erasure cascade (G7)", () => {
  it("deletes all five Scholar tables by userId inside the transaction", async () => {
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(200);

    expect(txReadingListItemDeleteMany).toHaveBeenCalledWith({
      where: { list: { userId: "user-1" } },
    });
    expect(txReadingListDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(txBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(txSearchHistoryDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(txPreferencesDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    // LoginAttempt is keyed by email (no User FK) — erased explicitly (Art. 17).
    expect(txLoginAttemptDeleteMany).toHaveBeenCalledWith({
      where: { email: "ada@example.com" },
    });
    // Analytics personal data is pseudonymised via the shared module — BOTH
    // AnalyticsEvent AND AcquisitionEvent (the latter was the closed Art. 17
    // erasure gap; before the fix only AnalyticsEvent was nulled).
    expect(txAnalyticsUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { userId: null },
    });
    expect(txAcquisitionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { userId: null },
    });
    // The user row is still deleted (cascade for FK-linked tables).
    expect(txUserDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("deletes reading-list items before the lists (children first)", async () => {
    await DELETE(makeRequest());

    const itemOrder = txReadingListItemDeleteMany.mock.invocationCallOrder[0];
    const listOrder = txReadingListDeleteMany.mock.invocationCallOrder[0];
    expect(itemOrder).toBeLessThan(listOrder);
  });

  it("erases Scholar rows before deleting the user row", async () => {
    await DELETE(makeRequest());

    const prefsOrder = txPreferencesDeleteMany.mock.invocationCallOrder[0];
    const userOrder = txUserDelete.mock.invocationCallOrder[0];
    expect(prefsOrder).toBeLessThan(userOrder);
  });

  it("does not run deletes when CSRF validation fails", async () => {
    mockValidateCsrf.mockReturnValue(false);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(403);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(txPreferencesDeleteMany).not.toHaveBeenCalled();
  });
});
