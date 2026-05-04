/**
 * /ui/[version] one-click toggle — Sprint 10G tests.
 *
 * Coverage:
 *
 *   1. Invalid version → 400
 *   2. Anonymous → 307 redirect to /login?next=/ui/<version>
 *   3. Authed v2 → user.update + cookie on response + 307 to /dashboard/posture
 *   4. Authed v1 → user.update + cookie on response + 307 to /dashboard
 *   5. Case-insensitive version handling
 *   6. DB write failure → 500 + structured logger.error, no redirect, no cookie
 *   7. revalidatePath called for /dashboard layout on success
 *
 * Why we inspect the NextResponse object directly:
 * The route uses `NextResponse.redirect(...)` + `response.cookies.set(...)`
 * for guaranteed Set-Cookie persistence (the `next/headers` + nav-redirect
 * combo dropped Set-Cookie on the redirect response in some Next.js 15
 * versions, producing the V1-chrome-wraps-V2-page bug we hit on prod).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuth,
  mockUserUpdate,
  mockRevalidatePath,
  mockLoggerInfo,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockRevalidatePath: vi.fn(),
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
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { GET } from "./route";

// NextRequest-shaped helper. The route only reads `request.url` to
// build the absolute URL for redirects, so a plain Request object
// works for every test path.
function makeReq(path = "/ui/v2"): Request {
  return new Request(`http://localhost${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Validation ──────────────────────────────────────────────────────────

describe("ui-toggle — version validation", () => {
  it("returns 400 on unknown version", async () => {
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v3" }),
    });
    expect(res.status).toBe(400);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns 400 on empty version", async () => {
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("normalises uppercase and accepts V2", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_1" } });
    mockUserUpdate.mockResolvedValueOnce({});
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "V2" }),
    });
    expect(res.status).toBe(307);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u_1" },
      data: { complyUiVersion: "v2" },
    });
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────

describe("ui-toggle — auth", () => {
  it("anonymous → 307 redirect to /login?next=/ui/v2", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?next=/ui/v2",
    );
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("session w/o user.id → also redirects to /login", async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: "x@example.com" } });
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?next=/ui/v2");
  });
});

// ─── Persist + redirect ─────────────────────────────────────────────────

describe("ui-toggle — happy path", () => {
  it("v2 → updates user, sets cookie on response, redirects to /dashboard/posture", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_42" } });
    mockUserUpdate.mockResolvedValueOnce({});
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/dashboard/posture",
    );

    // Cookie is on the redirect response (NOT lost across redirect).
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("caelex-comply-ui=v2");
    expect(setCookie).toContain("Path=/");
    expect(setCookie?.toLowerCase()).toContain("samesite=lax");

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u_42" },
      data: { complyUiVersion: "v2" },
    });
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "[ui-toggle] switched",
      expect.objectContaining({ userId: "u_42", target: "v2" }),
    );
  });

  it("v1 → cookie + redirect to /dashboard", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_42" } });
    mockUserUpdate.mockResolvedValueOnce({});
    const res = await GET(makeReq("/ui/v1") as never, {
      params: Promise.resolve({ version: "v1" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
    expect(res.headers.get("set-cookie")).toContain("caelex-comply-ui=v1");
  });

  it("calls revalidatePath('/dashboard', 'layout') on success", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_1" } });
    mockUserUpdate.mockResolvedValueOnce({});
    await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });
});

// ─── DB error handling ──────────────────────────────────────────────────

describe("ui-toggle — DB failure", () => {
  it("user.update throws → 500, no cookie, no revalidate, logger.error fires", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u_1" } });
    mockUserUpdate.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ version: "v2" }),
    });
    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
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
