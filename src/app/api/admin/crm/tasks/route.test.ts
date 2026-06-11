/**
 * /api/admin/crm/tasks — gate + assignee filter + assignee validation +
 * extended PATCH fields. Uses the REAL super-admin/assignees modules:
 * julian@caelex.eu passes the owner gate, niklas@caelex.eu is a valid
 * assignee, test-operator@caelex.eu is NOT (excluded from assignment).
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
  prisma: {
    crmTask: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    crmActivity: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { GET, POST, PATCH } from "./route";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// Must look like cuids (leading "c") — POST/PATCH validate assigneeId
// with z.string().cuid().
const ME = "cjulian00000000000000000a";
const NIKLAS = "cniklas00000000000000000b";
const TASK_ID = "cltask000000000000000000t";

function getReq(query = ""): NextRequest {
  return new Request(
    `http://localhost/api/admin/crm/tasks${query ? `?${query}` : ""}`,
  ) as unknown as NextRequest;
}

function jsonReq(method: "POST" | "PATCH", body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/crm/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { id: ME, email: "julian@caelex.eu" },
  } as never);
  vi.mocked(prisma.crmTask.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.crmTask.create).mockResolvedValue({
    id: TASK_ID,
    ownerId: ME,
  } as never);
  vi.mocked(prisma.crmTask.findUnique).mockResolvedValue({
    id: TASK_ID,
    title: "Alt",
    status: "OPEN",
    contactId: null,
    companyId: null,
    dealId: null,
  } as never);
  vi.mocked(prisma.crmTask.update).mockResolvedValue({
    id: TASK_ID,
  } as never);
  // Default: the looked-up assignee is Niklas (valid platform owner).
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    email: "niklas@caelex.eu",
  } as never);
});

describe("GET /api/admin/crm/tasks", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await GET(getReq())).status).toBe(401);
    expect(vi.mocked(prisma.crmTask.findMany)).not.toHaveBeenCalled();
  });

  it("403 for a non-admin non-owner", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u-x", email: "x@example.com" },
    } as never);
    const err = new Error("nope");
    err.name = "ForbiddenError";
    vi.mocked(requireRole).mockRejectedValue(err);
    expect((await GET(getReq())).status).toBe(403);
  });

  it("default = no assignee filter, status OPEN, assignee included", async () => {
    expect((await GET(getReq())).status).toBe(200);
    const args = vi.mocked(prisma.crmTask.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
      include: Record<string, unknown>;
    };
    expect(args.where).not.toHaveProperty("assigneeId");
    expect(args.where.status).toBe("OPEN");
    expect(args.include).toHaveProperty("assignee");
  });

  it("assignee=me filters on the session user", async () => {
    await GET(getReq("assignee=me"));
    const args = vi.mocked(prisma.crmTask.findMany).mock.calls[0][0] as {
      where: { assigneeId?: string | null };
    };
    expect(args.where.assigneeId).toBe(ME);
  });

  it("assignee=none filters on unassigned", async () => {
    await GET(getReq("assignee=none"));
    const args = vi.mocked(prisma.crmTask.findMany).mock.calls[0][0] as {
      where: { assigneeId?: string | null };
    };
    expect(args.where.assigneeId).toBeNull();
  });

  it("assignee=<userId> filters on that user", async () => {
    await GET(getReq(`assignee=${NIKLAS}&status=ALL`));
    const args = vi.mocked(prisma.crmTask.findMany).mock.calls[0][0] as {
      where: { assigneeId?: string | null; status?: unknown };
    };
    expect(args.where.assigneeId).toBe(NIKLAS);
    expect(args.where).not.toHaveProperty("status");
  });
});

describe("POST /api/admin/crm/tasks", () => {
  it("creates a standalone task (no record link) with an assignee", async () => {
    const res = await POST(
      jsonReq("POST", {
        title: "Niklas: Pitchdeck reviewen",
        assigneeId: NIKLAS,
      }),
    );
    expect(res.status).toBe(201);
    const createArgs = vi.mocked(prisma.crmTask.create).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.assigneeId).toBe(NIKLAS);
    expect(createArgs.data.ownerId).toBe(ME);
  });

  it("defaults to unassigned when no assigneeId is sent", async () => {
    const res = await POST(jsonReq("POST", { title: "Ohne Zuweisung" }));
    expect(res.status).toBe(201);
    const createArgs = vi.mocked(prisma.crmTask.create).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.assigneeId).toBeNull();
    // No assignee → no validation lookup needed.
    expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
  });

  it("400 when the assignee user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const res = await POST(jsonReq("POST", { title: "X", assigneeId: NIKLAS }));
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.crmTask.create)).not.toHaveBeenCalled();
  });

  it("400 when the assignee is not an assignable owner (test-operator)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: "test-operator@caelex.eu",
    } as never);
    const res = await POST(jsonReq("POST", { title: "X", assigneeId: NIKLAS }));
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.crmTask.create)).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/crm/tasks", () => {
  it("400 when no updatable field is provided", async () => {
    expect((await PATCH(jsonReq("PATCH", { id: TASK_ID }))).status).toBe(400);
  });

  it("updates title/dueDate/assigneeId in one call", async () => {
    const due = "2026-06-15T12:00:00.000+02:00";
    const res = await PATCH(
      jsonReq("PATCH", {
        id: TASK_ID,
        title: "Neu",
        dueDate: due,
        assigneeId: NIKLAS,
      }),
    );
    expect(res.status).toBe(200);
    const updateArgs = vi.mocked(prisma.crmTask.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArgs.data.title).toBe("Neu");
    expect(updateArgs.data.dueDate).toEqual(new Date(due));
    expect(updateArgs.data.assigneeId).toBe(NIKLAS);
    // No status in the body → completedAt untouched.
    expect(updateArgs.data).not.toHaveProperty("completedAt");
  });

  it("assigneeId: null unassigns without validation lookup", async () => {
    const res = await PATCH(
      jsonReq("PATCH", { id: TASK_ID, assigneeId: null }),
    );
    expect(res.status).toBe(200);
    const updateArgs = vi.mocked(prisma.crmTask.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArgs.data.assigneeId).toBeNull();
    expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
  });

  it("400 on an invalid assignee — task untouched", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const res = await PATCH(
      jsonReq("PATCH", { id: TASK_ID, assigneeId: NIKLAS }),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.crmTask.update)).not.toHaveBeenCalled();
  });

  it("OPEN → COMPLETED stamps completedAt and logs the activity", async () => {
    const res = await PATCH(
      jsonReq("PATCH", { id: TASK_ID, status: "COMPLETED" }),
    );
    expect(res.status).toBe(200);
    const updateArgs = vi.mocked(prisma.crmTask.update).mock.calls[0][0] as {
      data: { status?: string; completedAt?: Date | null };
    };
    expect(updateArgs.data.status).toBe("COMPLETED");
    expect(updateArgs.data.completedAt).toBeInstanceOf(Date);
    expect(vi.mocked(prisma.crmActivity.create)).toHaveBeenCalled();
  });

  it("COMPLETED → COMPLETED does not log a duplicate activity", async () => {
    vi.mocked(prisma.crmTask.findUnique).mockResolvedValue({
      id: TASK_ID,
      title: "Alt",
      status: "COMPLETED",
      contactId: null,
      companyId: null,
      dealId: null,
    } as never);
    const res = await PATCH(
      jsonReq("PATCH", { id: TASK_ID, status: "COMPLETED" }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.crmActivity.create)).not.toHaveBeenCalled();
  });

  it("404 on an unknown task", async () => {
    vi.mocked(prisma.crmTask.findUnique).mockResolvedValue(null as never);
    expect(
      (await PATCH(jsonReq("PATCH", { id: TASK_ID, status: "OPEN" }))).status,
    ).toBe(404);
  });
});
