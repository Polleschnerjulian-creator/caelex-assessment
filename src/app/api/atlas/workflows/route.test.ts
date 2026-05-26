import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/atlas-auth", () => ({
  getAtlasAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";
import { getAtlasAuth } from "@/lib/atlas-auth";

const mockAuth = vi.mocked(getAtlasAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    userId: "user-1",
    organizationId: "org-1",
  } as never);
});

const buildReq = (search: string = "") =>
  new Request(
    `http://localhost/api/atlas/workflows${search ? "?" + search : ""}`,
  ) as never;

describe("GET /api/atlas/workflows", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(buildReq());
    expect(res.status).toBe(401);
  });

  it("returns the full workflow list when no filter is supplied", async () => {
    const res = await GET(buildReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      workflows: unknown[];
      total: number;
      categories: unknown[];
    };
    expect(json.total).toBeGreaterThan(0);
    expect(json.workflows).toHaveLength(json.total);
    expect(json.categories).toBeDefined();
  });

  it("filters by category", async () => {
    const res = await GET(buildReq("category=compliance"));
    const json = (await res.json()) as {
      workflows: Array<{ category: string }>;
    };
    for (const w of json.workflows) {
      expect(w.category).toBe("compliance");
    }
  });

  it("filters to quickstarts only when quickstartsOnly=1", async () => {
    const res = await GET(buildReq("quickstartsOnly=1"));
    const json = (await res.json()) as {
      workflows: Array<{ isQuickstart?: boolean }>;
    };
    for (const w of json.workflows) {
      expect(w.isQuickstart).toBe(true);
    }
  });

  it("ignores quickstartsOnly when value is not '1'", async () => {
    /* The implementation explicitly checks === "1" so "true" / "yes"
       should be treated as falsy (return full list). */
    const fullRes = await GET(buildReq(""));
    const full = (await fullRes.json()) as { total: number };
    const otherRes = await GET(buildReq("quickstartsOnly=true"));
    const other = (await otherRes.json()) as { total: number };
    expect(other.total).toBe(full.total);
  });

  it("enriches PIPELINE workflows with stepCount + estimatedDurationMs", async () => {
    const res = await GET(buildReq());
    const json = (await res.json()) as {
      workflows: Array<{
        id: string;
        stepCount?: number;
        estimatedDurationMs?: number;
        requiresApproval?: boolean;
        pipeline?: unknown[];
      }>;
    };

    /* eu-space-act-vollanalyse has a 3-step pipeline. */
    const voll = json.workflows.find(
      (w) => w.id === "eu-space-act-vollanalyse",
    );
    expect(voll).toBeDefined();
    expect(voll?.stepCount).toBe(3);
    expect(voll?.estimatedDurationMs).toBeGreaterThan(0);
    expect(voll?.requiresApproval).toBe(false); // no draft_* in steps
  });

  it("flags requiresApproval=true for pipelines with approval-required tools", async () => {
    const res = await GET(buildReq());
    const json = (await res.json()) as {
      workflows: Array<{
        id: string;
        requiresApproval?: boolean;
      }>;
    };
    /* eu-space-act-mit-antrag has draft_authorization_application in
       step 4 — approval-required per tool-metadata. */
    const antrag = json.workflows.find(
      (w) => w.id === "eu-space-act-mit-antrag",
    );
    expect(antrag).toBeDefined();
    expect(antrag?.requiresApproval).toBe(true);
  });

  it("does NOT enrich single-prompt workflows (no pipeline)", async () => {
    const res = await GET(buildReq());
    const json = (await res.json()) as {
      workflows: Array<{
        id: string;
        pipeline?: unknown[];
        stepCount?: number;
        estimatedDurationMs?: number;
        requiresApproval?: boolean;
      }>;
    };
    /* nis2-classification is single-prompt (no pipeline field). */
    const nis2 = json.workflows.find((w) => w.id === "nis2-classification");
    expect(nis2).toBeDefined();
    expect(nis2?.pipeline).toBeUndefined();
    expect(nis2?.stepCount).toBeUndefined();
    expect(nis2?.estimatedDurationMs).toBeUndefined();
    expect(nis2?.requiresApproval).toBeUndefined();
  });

  it("4-step pipeline's estimatedDurationMs > 3-step pipeline's", async () => {
    const res = await GET(buildReq());
    const json = (await res.json()) as {
      workflows: Array<{
        id: string;
        estimatedDurationMs?: number;
      }>;
    };
    const voll = json.workflows.find(
      (w) => w.id === "eu-space-act-vollanalyse",
    );
    const antrag = json.workflows.find(
      (w) => w.id === "eu-space-act-mit-antrag",
    );
    /* mit-antrag has the same first 3 steps + adds draft_authorization
       which is high-cost (12s expected). Must be longer overall. */
    expect(antrag?.estimatedDurationMs ?? 0).toBeGreaterThan(
      voll?.estimatedDurationMs ?? 0,
    );
  });
});
