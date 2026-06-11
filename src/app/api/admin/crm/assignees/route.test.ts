/**
 * GET /api/admin/crm/assignees — gate (401/403) + happy path. Uses the
 * REAL super-admin/assignees modules so the test pins the actual
 * allowlist behaviour: founders are queried, test-operator is excluded.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const USERS = [
  { id: "u-julian", name: "Julian", email: "julian@caelex.eu" },
  { id: "u-niklas", name: "Niklas", email: "niklas@caelex.eu" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: "u-julian", email: "julian@caelex.eu" },
  } as never);
  vi.mocked(prisma.user.findMany).mockResolvedValue(USERS as never);
});

describe("GET /api/admin/crm/assignees", () => {
  it("401 when unauthenticated — no DB work", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.user.findMany)).not.toHaveBeenCalled();
  });

  it("403 when not super-admin and requireRole rejects — no DB work", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u-x", email: "someone@example.com" },
    } as never);
    const err = new Error("nope");
    err.name = "ForbiddenError";
    vi.mocked(requireRole).mockRejectedValue(err);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.user.findMany)).not.toHaveBeenCalled();
  });

  it("200 returns assignees + meId; queries founders but NOT test-operator", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      assignees: typeof USERS;
      meId: string;
    };
    expect(json.assignees).toEqual(USERS);
    expect(json.meId).toBe("u-julian");

    // The email allowlist passed to Prisma must exclude the test account.
    const args = vi.mocked(prisma.user.findMany).mock.calls[0][0] as {
      where: { email: { in: string[] } };
    };
    const emails = args.where.email.in;
    expect(emails).toContain("julian@caelex.eu");
    expect(emails).toContain("niklas@caelex.eu");
    expect(emails).not.toContain("test-operator@caelex.eu");
  });
});
