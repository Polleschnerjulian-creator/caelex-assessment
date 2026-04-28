// tests/unit/lib/legal-network/org-type.test.ts

/**
 * Unit tests for src/lib/legal-network/org-type.ts.
 *
 * The schema-drift-safe wrapper around Organization.orgType. The
 * wrapper exists because the Vercel build:deploy pipeline silently
 * swallows `prisma db push` failures, so production DBs sometimes
 * lack the orgType column. The pinned guarantees:
 *
 *   - getOrgType returns the value when the row exists
 *   - getOrgType returns null when the row is missing
 *   - getOrgType returns null + warns when prisma throws a column-
 *     missing error (drift mode) — does NOT propagate
 *   - getOrgType propagates any OTHER prisma error (we don't want to
 *     mask network / auth issues)
 *   - getCallerSide maps LAW_FIRM → ATLAS, OPERATOR → CAELEX, else null
 *   - findOrgForInvite retries without orgType on drift
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUniqueMock, warnMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: findUniqueMock },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: warnMock,
    error: vi.fn(),
  },
}));

import {
  getOrgType,
  getCallerSide,
  findOrgForInvite,
} from "@/lib/legal-network/org-type";

beforeEach(() => {
  findUniqueMock.mockReset();
  warnMock.mockReset();
});

describe("getOrgType — happy path", () => {
  it("returns LAW_FIRM when the row has orgType=LAW_FIRM", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "LAW_FIRM" });
    expect(await getOrgType("org-1")).toBe("LAW_FIRM");
  });

  it("returns OPERATOR when the row has orgType=OPERATOR", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "OPERATOR" });
    expect(await getOrgType("org-1")).toBe("OPERATOR");
  });

  it("returns BOTH when the row has orgType=BOTH", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "BOTH" });
    expect(await getOrgType("org-1")).toBe("BOTH");
  });

  it("returns null when the org row doesn't exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await getOrgType("missing-id")).toBeNull();
  });

  it("returns null when row exists but orgType is null", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: null });
    expect(await getOrgType("org-1")).toBeNull();
  });
});

describe("getOrgType — schema-drift defence", () => {
  it("returns null + warns when prisma throws 'column orgType does not exist'", async () => {
    findUniqueMock.mockRejectedValueOnce(
      new Error('column "orgType" does not exist'),
    );
    expect(await getOrgType("org-1")).toBeNull();
    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0][0]).toMatch(/Schema drift/);
  });

  it("matches the alternate 'orgtype does not exist' phrasing", async () => {
    findUniqueMock.mockRejectedValueOnce(
      new Error("relation column orgtype does not exist"),
    );
    expect(await getOrgType("org-1")).toBeNull();
    expect(warnMock).toHaveBeenCalledOnce();
  });

  it("PROPAGATES non-drift errors (network/auth must not be masked)", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("Connection refused"));
    await expect(getOrgType("org-1")).rejects.toThrow("Connection refused");
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("propagates non-Error rejections without log", async () => {
    findUniqueMock.mockRejectedValueOnce("plain-string-error");
    await expect(getOrgType("org-1")).rejects.toBe("plain-string-error");
    expect(warnMock).not.toHaveBeenCalled();
  });
});

describe("getCallerSide — bilateral discriminator", () => {
  it("maps LAW_FIRM → ATLAS", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "LAW_FIRM" });
    expect(await getCallerSide("org-1")).toBe("ATLAS");
  });

  it("maps OPERATOR → CAELEX", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "OPERATOR" });
    expect(await getCallerSide("org-1")).toBe("CAELEX");
  });

  it("returns null when orgType=BOTH (caller decides via context)", async () => {
    findUniqueMock.mockResolvedValueOnce({ orgType: "BOTH" });
    expect(await getCallerSide("org-1")).toBeNull();
  });

  it("returns null when org row missing", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await getCallerSide("missing")).toBeNull();
  });

  it("returns null on schema drift", async () => {
    findUniqueMock.mockRejectedValueOnce(
      new Error('column "orgType" does not exist'),
    );
    expect(await getCallerSide("org-1")).toBeNull();
  });
});

describe("findOrgForInvite — schema-drift retry", () => {
  it("returns the rich shape on happy path", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "org-1",
      orgType: "LAW_FIRM",
      isActive: true,
      name: "BHO Legal",
    });
    const o = await findOrgForInvite("org-1");
    expect(o).toEqual({
      id: "org-1",
      orgType: "LAW_FIRM",
      isActive: true,
      name: "BHO Legal",
    });
  });

  it("returns null when the org doesn't exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect(await findOrgForInvite("missing")).toBeNull();
  });

  it("retries without orgType on schema drift, returns orgType=null on success", async () => {
    findUniqueMock
      .mockRejectedValueOnce(new Error('column "orgType" does not exist'))
      .mockResolvedValueOnce({
        id: "org-1",
        isActive: true,
        name: "Op Org",
      });

    const o = await findOrgForInvite("org-1");
    expect(o).toEqual({
      id: "org-1",
      isActive: true,
      name: "Op Org",
      orgType: null,
    });
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0][0]).toMatch(/findOrgForInvite/);
  });

  it("returns null when the drift-retry also returns no row", async () => {
    findUniqueMock
      .mockRejectedValueOnce(new Error('column "orgType" does not exist'))
      .mockResolvedValueOnce(null);
    expect(await findOrgForInvite("missing")).toBeNull();
  });

  it("propagates non-drift errors without retry", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("Connection refused"));
    await expect(findOrgForInvite("org-1")).rejects.toThrow(
      "Connection refused",
    );
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });
});
