import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — notify.ts test coverage (T0.3).
 *
 * The dispatch helpers fan-out AtlasNotification rows on amendment
 * approval. Three invariants matter:
 *   1. Source amendments reach BOTH source-subscribers AND
 *      jurisdiction-subscribers (union with dedupe on userId).
 *   2. A user subscribed to both source + jurisdiction gets exactly
 *      ONE notification (not two).
 *   3. Failure is non-blocking — the helper returns {recipientCount: 0}
 *      and logs a warn, never throws.
 *
 * Without coverage, a refactor could quietly break dedup, double-
 * notify users on every amendment, and erode trust in the alerts UI.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany, createMany, getSource } = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  getSource: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasAlertSubscription: { findMany },
    atlasNotification: { createMany },
  },
}));

vi.mock("@prisma/client", () => ({
  AtlasAlertTargetType: { SOURCE: "SOURCE", JURISDICTION: "JURISDICTION" },
  AtlasNotificationKind: {
    SOURCE_AMENDED: "SOURCE_AMENDED",
    JURISDICTION_UPDATE: "JURISDICTION_UPDATE",
    ADMIN_BROADCAST: "ADMIN_BROADCAST",
  },
}));

vi.mock("@/data/legal-sources", () => ({
  getLegalSourceById: getSource,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { dispatchSourceAmendment, dispatchJurisdictionUpdate } from "./notify";
import { logger } from "@/lib/logger";

beforeEach(() => {
  findMany.mockReset();
  createMany.mockReset();
  getSource.mockReset();
  vi.mocked(logger.info).mockReset();
  vi.mocked(logger.warn).mockReset();
});

/* ── dispatchSourceAmendment ────────────────────────────────────────── */

describe("dispatchSourceAmendment", () => {
  it("queries subscribers for the source + its jurisdiction (OR)", async () => {
    getSource.mockReturnValue({ id: "DE-WeltraumG", jurisdiction: "DE" });
    findMany.mockResolvedValue([{ userId: "u1", organizationId: "org-A" }]);
    createMany.mockResolvedValue({ count: 1 });

    await dispatchSourceAmendment({
      sourceId: "DE-WeltraumG",
      title: "Amended",
      summary: "Article 5 added.",
    });

    const arg = findMany.mock.calls[0]?.[0] as {
      where: { OR: Array<Record<string, unknown>> };
    };
    expect(arg.where.OR).toEqual([
      { targetType: "SOURCE", targetId: "DE-WeltraumG" },
      { targetType: "JURISDICTION", targetId: "DE" },
    ]);
  });

  it("omits jurisdiction-branch when source has no jurisdiction", async () => {
    getSource.mockReturnValue(undefined); // unknown source → no jurisdiction
    findMany.mockResolvedValue([]);

    await dispatchSourceAmendment({
      sourceId: "UNKNOWN-X",
      title: "Amended",
      summary: "test",
    });

    const arg = findMany.mock.calls[0]?.[0] as {
      where: { OR: Array<Record<string, unknown>> };
    };
    expect(arg.where.OR).toEqual([
      { targetType: "SOURCE", targetId: "UNKNOWN-X" },
    ]);
  });

  it("returns recipientCount=0 when no subscribers exist (no DB write)", async () => {
    getSource.mockReturnValue({ id: "DE-X", jurisdiction: "DE" });
    findMany.mockResolvedValue([]);

    const result = await dispatchSourceAmendment({
      sourceId: "DE-X",
      title: "x",
      summary: "y",
    });

    expect(result.recipientCount).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("dedupes users subscribed to BOTH source + jurisdiction", async () => {
    getSource.mockReturnValue({ id: "DE-WeltraumG", jurisdiction: "DE" });
    /* Same userId appears in both SOURCE + JURISDICTION rows.
       Prisma returns BOTH (different targetType), but our dedup
       must collapse to ONE notification. */
    findMany.mockResolvedValue([
      { userId: "u-dual", organizationId: "org-A" }, // from SOURCE
      { userId: "u-dual", organizationId: "org-A" }, // from JURISDICTION
      { userId: "u-only-source", organizationId: "org-A" },
    ]);
    createMany.mockResolvedValue({ count: 2 });

    const result = await dispatchSourceAmendment({
      sourceId: "DE-WeltraumG",
      title: "Amended",
      summary: "test",
    });

    expect(result.recipientCount).toBe(2); // dedup: 3 rows → 2 users
    const data = createMany.mock.calls[0]?.[0]?.data as Array<{
      userId: string;
    }>;
    const userIds = data.map((d) => d.userId);
    expect(userIds).toHaveLength(2);
    expect(new Set(userIds)).toEqual(new Set(["u-dual", "u-only-source"]));
  });

  it("creates one notification per subscriber with SOURCE_AMENDED kind", async () => {
    getSource.mockReturnValue({ id: "EU-NIS2", jurisdiction: "EU" });
    findMany.mockResolvedValue([
      { userId: "u1", organizationId: "org-A" },
      { userId: "u2", organizationId: "org-B" },
    ]);
    createMany.mockResolvedValue({ count: 2 });

    await dispatchSourceAmendment({
      sourceId: "EU-NIS2",
      title: "Heading",
      summary: "Body",
    });

    const data = createMany.mock.calls[0]?.[0]?.data as Array<{
      kind: string;
      targetType: string;
      targetId: string;
      sourceId: string;
      title: string;
      summary: string;
    }>;
    expect(data).toHaveLength(2);
    for (const row of data) {
      expect(row.kind).toBe("SOURCE_AMENDED");
      expect(row.targetType).toBe("SOURCE");
      expect(row.targetId).toBe("EU-NIS2");
      expect(row.sourceId).toBe("EU-NIS2");
      expect(row.title).toBe("Heading");
      expect(row.summary).toBe("Body");
    }
  });

  it("is non-blocking: prisma failure → recipientCount=0 + warn log, no throw", async () => {
    getSource.mockReturnValue({ id: "DE-X", jurisdiction: "DE" });
    findMany.mockRejectedValue(new Error("DB exploded"));

    const result = await dispatchSourceAmendment({
      sourceId: "DE-X",
      title: "x",
      summary: "y",
    });

    expect(result.recipientCount).toBe(0);
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("dispatch failed"),
      expect.objectContaining({
        error: expect.stringContaining("DB exploded"),
      }),
    );
  });

  it("logs info on successful fan-out with subscriber count", async () => {
    getSource.mockReturnValue({ id: "DE-X", jurisdiction: "DE" });
    findMany.mockResolvedValue([
      { userId: "u1", organizationId: "org-A" },
      { userId: "u2", organizationId: "org-A" },
      { userId: "u3", organizationId: "org-A" },
    ]);
    createMany.mockResolvedValue({ count: 3 });

    await dispatchSourceAmendment({
      sourceId: "DE-X",
      title: "x",
      summary: "y",
    });

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.stringContaining("fan-out complete"),
      expect.objectContaining({ recipients: 3, kind: "SOURCE_AMENDED" }),
    );
  });
});

/* ── dispatchJurisdictionUpdate ─────────────────────────────────────── */

describe("dispatchJurisdictionUpdate", () => {
  it("queries subscribers only for the jurisdiction (no source-branch)", async () => {
    findMany.mockResolvedValue([{ userId: "u1", organizationId: "org-A" }]);
    createMany.mockResolvedValue({ count: 1 });

    await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "New DE regulation",
      summary: "...",
    });

    const arg = findMany.mock.calls[0]?.[0] as {
      where: { targetType: string; targetId: string };
    };
    expect(arg.where.targetType).toBe("JURISDICTION");
    expect(arg.where.targetId).toBe("DE");
  });

  it("returns recipientCount=0 when no subscribers (no DB write)", async () => {
    findMany.mockResolvedValue([]);

    const result = await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "x",
      summary: "y",
    });
    expect(result.recipientCount).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("creates one notification per subscriber with JURISDICTION_UPDATE kind", async () => {
    findMany.mockResolvedValue([
      { userId: "u1", organizationId: "org-A" },
      { userId: "u2", organizationId: "org-B" },
    ]);
    createMany.mockResolvedValue({ count: 2 });

    await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      sourceId: "DE-NEW-LAW",
      title: "Heading",
      summary: "Body",
    });

    const data = createMany.mock.calls[0]?.[0]?.data as Array<{
      kind: string;
      targetType: string;
      targetId: string;
      sourceId: string | null;
    }>;
    for (const row of data) {
      expect(row.kind).toBe("JURISDICTION_UPDATE");
      expect(row.targetType).toBe("JURISDICTION");
      expect(row.targetId).toBe("DE");
      expect(row.sourceId).toBe("DE-NEW-LAW");
    }
  });

  it("sourceId defaults to null when not provided", async () => {
    findMany.mockResolvedValue([{ userId: "u1", organizationId: "org-A" }]);
    createMany.mockResolvedValue({ count: 1 });

    await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "x",
      summary: "y",
    });

    const data = createMany.mock.calls[0]?.[0]?.data as Array<{
      sourceId: string | null;
    }>;
    expect(data[0].sourceId).toBeNull();
  });

  it("is non-blocking: prisma failure → recipientCount=0 + warn log", async () => {
    findMany.mockRejectedValue(new Error("network timeout"));

    const result = await dispatchJurisdictionUpdate({
      jurisdiction: "DE",
      title: "x",
      summary: "y",
    });

    expect(result.recipientCount).toBe(0);
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("dispatch failed"),
      expect.objectContaining({
        error: expect.stringContaining("network timeout"),
      }),
    );
  });
});
