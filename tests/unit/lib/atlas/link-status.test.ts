// tests/unit/lib/atlas/link-status.test.ts

/**
 * Unit tests for src/lib/atlas/link-status.ts.
 *
 * `getLinkStatusMap` reads AtlasSourceCheck rows for a given set of
 * sourceIds and returns a map keyed by sourceId. The contract:
 *   - Empty input  → empty map, no DB hit
 *   - DB error     → empty map (NOT a throw — Atlas pages must keep rendering)
 *   - Dates        → ISO strings (Date.toISOString())
 *   - lastChanged  → null preserved when row has no last-changed timestamp
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are HOISTED above all imports, so we can't reference
// top-level test-file variables inside them. Use vi.hoisted to declare the
// mock fns in the same hoisted phase the factories run in.
const { findManyMock, warnMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasSourceCheck: { findMany: findManyMock },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: warnMock,
    error: vi.fn(),
  },
}));

import { getLinkStatusMap } from "@/lib/atlas/link-status";

beforeEach(() => {
  findManyMock.mockReset();
  warnMock.mockReset();
});

describe("getLinkStatusMap — empty input shortcut", () => {
  it("returns {} immediately when sourceIds is empty (no DB call)", async () => {
    const out = await getLinkStatusMap([]);
    expect(out).toEqual({});
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

describe("getLinkStatusMap — happy path", () => {
  it("maps each row by sourceId and converts Dates to ISO strings", async () => {
    const lastChecked = new Date("2026-04-28T10:00:00Z");
    const lastChanged = new Date("2026-04-15T08:30:00Z");
    findManyMock.mockResolvedValueOnce([
      {
        sourceId: "DE-VVG",
        status: "UNCHANGED",
        httpStatus: 200,
        lastChecked,
        lastChanged: null,
        errorMessage: null,
      },
      {
        sourceId: "EU-DORA",
        status: "CHANGED",
        httpStatus: 200,
        lastChecked,
        lastChanged,
        errorMessage: null,
      },
    ]);

    const out = await getLinkStatusMap(["DE-VVG", "EU-DORA"]);

    expect(Object.keys(out).sort()).toEqual(["DE-VVG", "EU-DORA"]);
    expect(out["DE-VVG"].status).toBe("UNCHANGED");
    expect(out["DE-VVG"].lastChecked).toBe(lastChecked.toISOString());
    expect(out["DE-VVG"].lastChanged).toBeNull();

    expect(out["EU-DORA"].status).toBe("CHANGED");
    expect(out["EU-DORA"].lastChanged).toBe(lastChanged.toISOString());
  });

  it("preserves errorMessage and httpStatus values verbatim", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        sourceId: "AT-WELTRG",
        status: "ERROR",
        httpStatus: 503,
        lastChecked: new Date("2026-04-28"),
        lastChanged: null,
        errorMessage: "Upstream HTTP 503",
      },
    ]);

    const out = await getLinkStatusMap(["AT-WELTRG"]);
    expect(out["AT-WELTRG"].httpStatus).toBe(503);
    expect(out["AT-WELTRG"].errorMessage).toBe("Upstream HTTP 503");
  });

  it("queries the DB with `in` clause for the requested ids", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await getLinkStatusMap(["A", "B", "C"]);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sourceId: { in: ["A", "B", "C"] } },
      }),
    );
  });

  it("ids missing from the result map are simply absent (not stubbed in)", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        sourceId: "DE-VVG",
        status: "UNCHANGED",
        httpStatus: 200,
        lastChecked: new Date("2026-04-28"),
        lastChanged: null,
        errorMessage: null,
      },
    ]);
    const out = await getLinkStatusMap(["DE-VVG", "MISSING-ID"]);
    expect(out["DE-VVG"]).toBeDefined();
    expect(out["MISSING-ID"]).toBeUndefined();
  });
});

describe("getLinkStatusMap — failure tolerance (M23)", () => {
  it("returns {} when prisma throws (Neon outage) and logs a warning", async () => {
    findManyMock.mockRejectedValueOnce(new Error("Neon: connection lost"));
    const out = await getLinkStatusMap(["DE-VVG"]);
    expect(out).toEqual({});
    expect(warnMock).toHaveBeenCalledOnce();
    const [msg, ctx] = warnMock.mock.calls[0];
    expect(msg).toMatch(/falling back to empty map/i);
    expect(ctx).toMatchObject({ sourceIdCount: 1 });
    expect(ctx.error).toContain("Neon: connection lost");
  });

  it("does NOT throw when the underlying call rejects (atlas pages must render)", async () => {
    findManyMock.mockRejectedValueOnce(new Error("oops"));
    await expect(getLinkStatusMap(["X"])).resolves.toEqual({});
  });

  it("non-Error rejections are stringified into the log context", async () => {
    findManyMock.mockRejectedValueOnce("string-rejection");
    await getLinkStatusMap(["X"]);
    expect(warnMock).toHaveBeenCalledOnce();
    const [, ctx] = warnMock.mock.calls[0];
    expect(ctx.error).toBe("string-rejection");
  });
});
