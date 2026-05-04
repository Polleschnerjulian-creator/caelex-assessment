/**
 * /ui/[version] one-click toggle — Sprint 10G tests.
 *
 * Coverage:
 *
 *   1. Invalid version → 400
 *   2. Anonymous → redirect to /login?next=/ui/<version>
 *   3. Authed v2 → user.update + cookie set + redirect to /dashboard/posture
 *   4. Authed v1 → user.update + cookie set + redirect to /dashboard
 *   5. Case-insensitive version handling
 *   6. DB write failure → 500 + structured logger.error, no redirect
 *
 * Both `redirect` and `cookies` are mocked because Next.js hooks
 * throw outside a request scope. We assert against the mock calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuth,
  mockUserUpdate,
  mockCookieSet,
  mockRedirect,
  mockLoggerInfo,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockCookieSet: vi.fn(),
  mockRedirect: vi.fn(() => {
    // Match Next.js semantics — redirect throws so the function
    // doesn't continue. The test catches and inspects the recorded
    // call.
    throw new Error("__NEXT_REDIRECT__");
  }),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: mockUserUpdate } },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: vi.fn(),
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mockCookieSet }),
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import { GET } from "./route";

function makeReq(): Request {
  return new Request("http://localhost/ui/v2");
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Validation ──────────────────────────────────────────────────────────

describe("ui-toggle — version validation", () => {
  it("returns 400 on unknown version", async () => {
    const res = await GET(makeReq(), {
      params: Promise.resolve({ version: "v3" }),
    });
    expect(res.status).toBe(400);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns 400 on empty version", async () => {
    const res = await GET(makeReq(), {
      params: Promise.resolve({ version: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("normalises uppercase and accepts V2", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_1" } });
    mockUserUpdate.mockResolvedValueOnce({});
    await expect(
      GET(makeReq(), { params: Promise.resolve({ version: "V2" }) }),
    ).rejects.toThrow("__NEXT_REDIRECT__");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u_1" },
      data: { complyUiVersion: "v2" },
    });
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────

describe("ui-toggle — auth", () => {
  it("anonymous → redirects to /login with next=/ui/v2", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(
      GET(makeReq(), { params: Promise.resolve({ version: "v2" }) }),
    ).rejects.toThrow("__NEXT_REDIRECT__");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=/ui/v2");
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("session w/o user.id → also redirects to /login", async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: "x@example.com" } });
    await expect(
      GET(makeReq(), { params: Promise.resolve({ version: "v2" }) }),
    ).rejects.toThrow("__NEXT_REDIRECT__");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=/ui/v2");
  });
});

// ─── Persist + redirect ─────────────────────────────────────────────────

describe("ui-toggle — happy path", () => {
  it("v2 → updates user, sets cookie, redirects to /dashboard/posture", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_42" } });
    mockUserUpdate.mockResolvedValueOnce({});
    await expect(
      GET(makeReq(), { params: Promise.resolve({ version: "v2" }) }),
    ).rejects.toThrow("__NEXT_REDIRECT__");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u_42" },
      data: { complyUiVersion: "v2" },
    });
    expect(mockCookieSet).toHaveBeenCalledWith(
      "caelex-comply-ui",
      "v2",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/posture");
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "[ui-toggle] switched",
      expect.objectContaining({ userId: "u_42", target: "v2" }),
    );
  });

  it("v1 → updates user, sets cookie, redirects to /dashboard", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_42" } });
    mockUserUpdate.mockResolvedValueOnce({});
    await expect(
      GET(makeReq(), { params: Promise.resolve({ version: "v1" }) }),
    ).rejects.toThrow("__NEXT_REDIRECT__");
    expect(mockCookieSet).toHaveBeenCalledWith(
      "caelex-comply-ui",
      "v1",
      expect.any(Object),
    );
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── DB error handling ──────────────────────────────────────────────────

describe("ui-toggle — DB failure", () => {
  it("user.update throws → 500 + logger.error, NO redirect, NO cookie set", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_1" } });
    mockUserUpdate.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeReq(), {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(res.status).toBe(500);
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      "[ui-toggle] persist failed",
      expect.objectContaining({
        userId: "u_1",
        target: "v2",
        error: "DB down",
      }),
    );
  });
});
