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

// (c) Org four-eyes policy resolver. Default mock = four-eyes OFF so the
// pre-existing ACCEPTED-path tests keep passing; the four-eyes-ON tests
// override per-case.
vi.mock("@/lib/trade/classification-approval-context.server", () => ({
  resolveApprovalContext: vi
    .fn()
    .mockResolvedValue({ fourEyesEnabled: false, soleEligibleApprover: false }),
}));

// (d) Audit log + ops-event emitters.
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test" }),
}));

vi.mock("@/lib/comply-v2/trade/ops-events.server", () => ({
  emitTradeEvent: vi.fn().mockResolvedValue(undefined),
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
import { resolveApprovalContext } from "@/lib/trade/classification-approval-context.server";
import { logAuditEvent } from "@/lib/audit";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

const resolveApproval = resolveApprovalContext as unknown as ReturnType<
  typeof vi.fn
>;
const auditLog = logAuditEvent as unknown as ReturnType<typeof vi.fn>;
const opsEvent = emitTradeEvent as unknown as ReturnType<typeof vi.fn>;

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
  resolveApproval.mockReset();
  // Default: four-eyes OFF (single-actor ACCEPTED self-sign allowed).
  resolveApproval.mockResolvedValue({
    fourEyesEnabled: false,
    soleEligibleApprover: false,
  });
  auditLog.mockReset();
  auditLog.mockResolvedValue(undefined);
  opsEvent.mockReset();
  opsEvent.mockResolvedValue(undefined);
});

const validBody = {
  item: { name: "Reaction wheel RW-250", description: "AOCS momentum wheel" },
  confirmedCode: { canonicalId: "ECCN:9A515.a.1", eccnUS: "9A515.a.1" },
};

describe("POST /api/trade/assess/from-datasheet", () => {
  it("returns 403 when getTradeAuth resolves null", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(403);
  });

  it("returns 403 for a VIEWER and never touches the DB (B9)", async () => {
    auth.mockResolvedValue({
      ...validAuth,
      role: "VIEWER" as import("@prisma/client").OrganizationRole,
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
    expect(tradeItemCreate).not.toHaveBeenCalled();
    expect(draftCreate).not.toHaveBeenCalled();
  });

  it("allows a MEMBER to persist a confirmed classification (B9)", async () => {
    auth.mockResolvedValue({
      ...validAuth,
      role: "MEMBER" as import("@prisma/client").OrganizationRole,
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    expect(tradeItemCreate).toHaveBeenCalled();
    expect(draftCreate).toHaveBeenCalled();
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

  // ── (c) disclaimerAtReview + four-eyes consultation ──────────────────────

  it("persists disclaimerAtReview from the evidence blob on an ACCEPTED self-sign (four-eyes OFF)", async () => {
    const body = {
      item: { name: "ST-300", description: "" },
      confirmedCode: { canonicalId: "USML:XV(e)(16)", regime: "ITAR-USML" },
      evidence: { disclaimer: "Screening-level guidance only — verify." },
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(201);
    const draftArg = draftCreate.mock.calls.at(-1)?.[0];
    expect(draftArg?.data.decision).toBe("ACCEPTED");
    expect(draftArg?.data.disclaimerAtReview).toBe(
      "Screening-level guidance only — verify.",
    );
  });

  it("four-eyes ON: the self-sign is NOT auto-approved — draft persists PENDING, no reviewer stamp (fail-closed)", async () => {
    resolveApproval.mockResolvedValue({
      fourEyesEnabled: true,
      soleEligibleApprover: false,
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);

    // The TradeItem still carries the confirmed code on its cell + stays
    // REQUIRES_REVIEW, so the verdict engine still treats it as controlled.
    const itemArg = tradeItemCreate.mock.calls.at(-1)?.[0];
    expect(itemArg?.data).toMatchObject({
      eccnUS: "9A515.a.1",
      status: "REQUIRES_REVIEW",
    });

    // But the DRAFT is PENDING (awaiting a second reviewer) — NOT a forged
    // self-approval. No reviewer stamp.
    const draftArg = draftCreate.mock.calls.at(-1)?.[0];
    expect(draftArg?.data.decision).toBe("PENDING");
    expect(draftArg?.data.reviewedById ?? null).toBeNull();
    expect(draftArg?.data.reviewedAt ?? null).toBeNull();
  });

  it("four-eyes ON: response signals the awaiting-review state", async () => {
    resolveApproval.mockResolvedValue({
      fourEyesEnabled: true,
      soleEligibleApprover: false,
    });
    const res = await POST(makeReq(validBody));
    const json = await res.json();
    expect(json.decision).toBe("PENDING");
  });

  // ── (d) AuditLog + ops-event on persist ──────────────────────────────────

  it("emits an AuditLog entry + ops-event when a confirmed classification persists", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);

    expect(auditLog).toHaveBeenCalledTimes(1);
    const auditArg = auditLog.mock.calls.at(-1)?.[0];
    expect(auditArg).toMatchObject({
      userId: "user-1",
      organizationId: "org-1",
      entityType: "trade_item",
      entityId: "item-new",
    });

    expect(opsEvent).toHaveBeenCalledTimes(1);
    const [channel, envelope] = opsEvent.mock.calls.at(-1) ?? [];
    expect(channel).toBe("trade.classification.confirmed");
    expect(envelope).toMatchObject({ organizationId: "org-1" });
  });
});
