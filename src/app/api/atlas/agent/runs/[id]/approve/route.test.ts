import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIdentifier: vi.fn().mockReturnValue("test-id"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAgentRun: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

import { POST } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(getAtlasAuth);
const mockRl = vi.mocked(checkRateLimit);
const mockFindFirst = vi.mocked(prisma.atlasAgentRun.findFirst);
const mockUpdate = vi.mocked(prisma.atlasAgentRun.update);

const buildReq = (body: unknown) =>
  new Request("http://localhost/api/atlas/agent/runs/abc/approve", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;

const ctx = { params: Promise.resolve({ id: "abc" }) };

describe("POST /approve — batched body (E2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
    } as never);
    mockRl.mockResolvedValue({ success: true } as never);
  });

  it("applies multiple decisions atomically", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
        {
          toolUseId: "tool-2",
          toolName: "send_email",
          originalInput: {},
          decision: null,
          rationale: "y",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);
    mockUpdate.mockResolvedValue({} as never);

    const res = await POST(
      buildReq({
        decisions: [
          { toolUseId: "tool-1", decision: "approved" },
          { toolUseId: "tool-2", decision: "rejected" },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
    const updateArg = mockUpdate.mock.calls[0][0];
    const gates = (updateArg.data as { approvalGates: unknown[] })
      .approvalGates as Array<{ toolUseId: string; decision: string }>;
    expect(gates).toHaveLength(2);
    expect(gates[0].decision).toBe("approved");
    expect(gates[1].decision).toBe("rejected");
  });

  it("rejects when any toolUseId is missing", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);

    const res = await POST(
      buildReq({
        decisions: [
          { toolUseId: "tool-1", decision: "approved" },
          { toolUseId: "tool-nonexistent", decision: "approved" },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when any decision is already recorded", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: {},
          decision: "approved",
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: "2026-05-15T00:00:01Z",
        },
      ],
    } as never);

    const res = await POST(
      buildReq({
        decisions: [{ toolUseId: "tool-1", decision: "rejected" }],
      }),
      ctx,
    );
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("accepts modifiedInput when decision === 'modified'", async () => {
    mockFindFirst.mockResolvedValue({
      id: "abc",
      status: "awaiting_approval",
      pausedForApproval: true,
      approvalGates: [
        {
          toolUseId: "tool-1",
          toolName: "create_matter_invite",
          originalInput: { foo: "old" },
          decision: null,
          rationale: "x",
          requestedAt: "2026-05-15T00:00:00Z",
          decidedAt: null,
        },
      ],
    } as never);
    mockUpdate.mockResolvedValue({} as never);

    const res = await POST(
      buildReq({
        decisions: [
          {
            toolUseId: "tool-1",
            decision: "modified",
            modifiedInput: { foo: "new" },
          },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const updateArg = mockUpdate.mock.calls[0][0];
    const gates = (updateArg.data as { approvalGates: unknown[] })
      .approvalGates as Array<{
      decision: string;
      modifiedInput?: Record<string, unknown>;
    }>;
    expect(gates[0].decision).toBe("modified");
    expect(gates[0].modifiedInput).toEqual({ foo: "new" });
  });
});
