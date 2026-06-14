/**
 * Route test — POST /api/trade/assess/from-datasheet.
 *
 * Persists a HUMAN-CONFIRMED datasheet classification as:
 *   - a TradeItem (status REQUIRES_REVIEW, the confirmed code set), plus
 *   - a TradeItemClassificationDraft (decision ACCEPTED, acceptedSnapshot)
 * in one atomic $transaction. Returns { itemId }.
 *
 * Mirrors the Prisma-mock pattern of the sibling /api/trade/items route test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/trade/trade-auth", () => ({
  getTradeAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-user"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// The $transaction callback receives a `tx` client. We hand it the same
// stub object so both creates land on the spied mocks. The factory is hoisted,
// so the spies are created inside it and pulled back out via the mocked import.
vi.mock("@/lib/prisma", () => {
  const tx = {
    tradeItem: { create: vi.fn() },
    tradeItemClassificationDraft: { create: vi.fn() },
  };
  return {
    prisma: {
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
      __tx: tx,
    },
  };
});

import { POST } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";

const tx = (
  prisma as unknown as {
    __tx: {
      tradeItem: { create: ReturnType<typeof vi.fn> };
      tradeItemClassificationDraft: { create: ReturnType<typeof vi.fn> };
    };
  }
).__tx;
const tradeItemCreate = tx.tradeItem.create;
const draftCreate = tx.tradeItemClassificationDraft.create;

const auth = getTradeAuth as unknown as ReturnType<typeof vi.fn>;

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

function makeReq(body?: unknown): Request {
  return new Request("http://localhost/api/trade/assess/from-datasheet", {
    method: "POST",
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

beforeEach(() => {
  auth.mockReset();
  auth.mockResolvedValue(validAuth);
  tradeItemCreate.mockReset();
  tradeItemCreate.mockResolvedValue({ id: "item-new" });
  draftCreate.mockReset();
  draftCreate.mockResolvedValue({ id: "draft-new" });
});

describe("POST /api/trade/assess/from-datasheet", () => {
  it("returns 403 when getTradeAuth resolves null", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(403);
  });

  it("returns 400 on a malformed body (no item)", async () => {
    const res = await POST(makeReq({ confirmedCode: { canonicalId: "x" } }));
    expect(res.status).toBe(400);
  });

  it("persists a TradeItem (REQUIRES_REVIEW + confirmed code) and an ACCEPTED draft", async () => {
    const body = {
      item: {
        name: "Reaction wheel RW-250",
        description: "AOCS momentum wheel",
        manufacturerName: "Acme Space",
        apertureMeters: 0.7,
      },
      confirmedCode: {
        canonicalId: "ECCN:9A515.a.1",
        regime: "EAR-CCL",
        confidence: "HIGH",
        eccnUS: "9A515.a.1",
      },
      evidence: {
        proposals: [{ canonicalId: "ECCN:9A515.a.1" }],
        summary: "Aperture above threshold",
      },
      sourceFilename: "rw-250-datasheet.pdf",
    };

    const res = await POST(makeReq(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ itemId: "item-new" });

    // TradeItem: org-scoped, confirmed code on the regime cell, REQUIRES_REVIEW.
    const itemArg = tradeItemCreate.mock.calls.at(-1)?.[0];
    expect(itemArg?.data).toMatchObject({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Reaction wheel RW-250",
      eccnUS: "9A515.a.1",
      status: "REQUIRES_REVIEW",
    });

    // Draft: linked to the new item, ACCEPTED, reviewer stamped, snapshot kept.
    const draftArg = draftCreate.mock.calls.at(-1)?.[0];
    expect(draftArg?.data).toMatchObject({
      organizationId: "org-1",
      tradeItemId: "item-new",
      createdById: "user-1",
      reviewedById: "user-1",
      decision: "ACCEPTED",
      sourceFilename: "rw-250-datasheet.pdf",
    });
    expect(draftArg?.data.acceptedSnapshot).toMatchObject({
      canonicalId: "ECCN:9A515.a.1",
    });
    expect(draftArg?.data.evidence).toMatchObject({
      summary: "Aperture above threshold",
    });
  });

  it("persists the scoped extended attribute bag into parametricAttributes", async () => {
    const body = {
      item: {
        name: "ST-300",
        description: "",
        parametricAttributes: { starTrackerAccuracyArcsec: 10 },
      },
      confirmedCode: {
        canonicalId: "USML:XV(e)(16)",
        regime: "ITAR-USML",
      },
    };

    const res = await POST(makeReq(body));
    expect(res.status).toBe(201);

    const itemArg = tradeItemCreate.mock.calls.at(-1)?.[0];
    expect(itemArg?.data.parametricAttributes).toEqual({
      starTrackerAccuracyArcsec: 10,
    });
  });
});
