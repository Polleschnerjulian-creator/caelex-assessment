import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-id"),
}));

vi.mock("@/lib/atlas/workflow-pipeline-runner.server", () => ({
  runWorkflowPipeline: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { runWorkflowPipeline } from "@/lib/atlas/workflow-pipeline-runner.server";

const mockAuth = vi.mocked(getAtlasAuth);
const mockRl = vi.mocked(checkRateLimit);
const mockRun = vi.mocked(runWorkflowPipeline);

const buildReq = (body: unknown = {}) =>
  new Request(
    "http://localhost/api/atlas/workflows/eu-space-act-vollanalyse/run",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  ) as never;

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    userId: "user-1",
    organizationId: "org-1",
  } as never);
  mockRl.mockResolvedValue({ success: true } as never);
});

describe("POST /api/atlas/workflows/[id]/run", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(buildReq(), ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(401);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockRl.mockResolvedValue({
      success: false,
      retryAfter: 42,
    } as never);

    const res = await POST(buildReq(), ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid workflow id (empty)", async () => {
    const res = await POST(buildReq(), ctx(""));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("workflow id");
  });

  it("returns 400 on workflow id > 200 chars", async () => {
    const res = await POST(buildReq(), ctx("x".repeat(201)));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/atlas/workflows/x/run", {
      method: "POST",
      body: "not-json{",
    }) as never;
    const res = await POST(req, ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Invalid JSON");
  });

  it("returns 400 on invalid payload (bad enum value)", async () => {
    const res = await POST(
      buildReq({ language: "klingon" }),
      ctx("eu-space-act-vollanalyse"),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; fields?: unknown };
    expect(json.error).toContain("Invalid payload");
  });

  it("returns 404 when runner reports WORKFLOW_NOT_FOUND", async () => {
    mockRun.mockResolvedValue({
      workflowId: "missing",
      chatId: "",
      steps: [],
      totalDurationMs: 5,
      isCompleted: false,
      aborted: {
        code: "WORKFLOW_NOT_FOUND",
        message: "Workflow not found: missing",
      },
    } as never);

    const res = await POST(buildReq(), ctx("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when runner reports NO_PIPELINE", async () => {
    mockRun.mockResolvedValue({
      workflowId: "nis2-classification",
      chatId: "",
      steps: [],
      totalDurationMs: 3,
      isCompleted: false,
      aborted: {
        code: "NO_PIPELINE",
        message: "Workflow has no pipeline: nis2-classification",
      },
    } as never);

    const res = await POST(buildReq(), ctx("nis2-classification"));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("NO_PIPELINE");
  });

  it("returns 200 + awaitingApproval when pipeline halts pre-flight", async () => {
    mockRun.mockResolvedValue({
      workflowId: "eu-space-act-mit-antrag",
      chatId: "",
      steps: [],
      totalDurationMs: 10,
      isCompleted: false,
      awaitingApproval: {
        pendingSteps: [
          {
            stepIndex: 3,
            requiresApprovalTools: ["draft_authorization_application"],
          },
        ],
      },
    } as never);

    const res = await POST(buildReq(), ctx("eu-space-act-mit-antrag"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      awaitingApproval: { pendingSteps: { stepIndex: number }[] };
    };
    expect(json.awaitingApproval.pendingSteps[0].stepIndex).toBe(3);
  });

  it("returns 200 + isCompleted=true on happy path", async () => {
    mockRun.mockResolvedValue({
      workflowId: "eu-space-act-vollanalyse",
      chatId: "chat-abc",
      steps: [
        {
          stepIndex: 0,
          promptPreview: "Step 1",
          assistantText: "ok",
          toolsUsed: ["assess_eu_space_act"],
          durationMs: 100,
          isError: false,
        },
      ],
      totalDurationMs: 100,
      isCompleted: true,
    } as never);

    const res = await POST(buildReq(), ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { isCompleted: boolean; chatId: string };
    expect(json.isCompleted).toBe(true);
    expect(json.chatId).toBe("chat-abc");
  });

  it("forwards body fields to runWorkflowPipeline", async () => {
    mockRun.mockResolvedValue({
      workflowId: "eu-space-act-mit-antrag",
      chatId: "c",
      steps: [],
      totalDurationMs: 1,
      isCompleted: true,
    } as never);

    await POST(
      buildReq({
        bypassApproval: true,
        mandateId: "m-42",
        language: "en",
        abortOnEmptyTurn: false,
        toolToggles: { web: true, korpus: true },
        retryPolicy: { maxRetries: 1, backoffMs: [500] },
      }),
      ctx("eu-space-act-mit-antrag"),
    );

    const arg = mockRun.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      workflowId: "eu-space-act-mit-antrag",
      userId: "user-1",
      organizationId: "org-1",
      mandateId: "m-42",
      language: "en",
      bypassApproval: true,
      abortOnEmptyTurn: false,
      toolToggles: { web: true, korpus: true },
      retryPolicy: { maxRetries: 1, backoffMs: [500] },
    });
  });

  it("accepts empty body (all fields optional)", async () => {
    mockRun.mockResolvedValue({
      workflowId: "eu-space-act-vollanalyse",
      chatId: "c",
      steps: [],
      totalDurationMs: 1,
      isCompleted: true,
    } as never);

    const req = new Request(
      "http://localhost/api/atlas/workflows/eu-space-act-vollanalyse/run",
      {
        method: "POST",
        /* No body at all. */
      },
    ) as never;

    const res = await POST(req, ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(200);
  });

  it("returns 500 + logged error on unexpected runner throw", async () => {
    mockRun.mockRejectedValue(new Error("pipeline exploded"));

    const res = await POST(buildReq(), ctx("eu-space-act-vollanalyse"));
    expect(res.status).toBe(500);
  });
});
