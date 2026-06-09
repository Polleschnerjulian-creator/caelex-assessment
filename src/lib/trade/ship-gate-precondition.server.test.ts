import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: { tradeOperation: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// assessOperation is mocked so each test drives a precise verdict without
// exercising the full classification engine. The real OperationNotFoundError
// is re-exported through the module-under-test.
vi.mock("@/lib/trade/operation-assistant.server", () => {
  class OperationNotFoundError extends Error {
    constructor(operationId: string) {
      super(`Trade operation ${operationId} not found`);
      this.name = "OperationNotFoundError";
    }
  }
  return {
    assessOperation: vi.fn(),
    OperationNotFoundError,
  };
});

import { prisma } from "@/lib/prisma";
import { assessOperation } from "@/lib/trade/operation-assistant.server";
import {
  evaluateShipGate,
  composeExplained,
  OperationNotFoundError,
  type ShipGatePreconditionValue,
} from "./ship-gate-precondition.server";

const findFirst = prisma.tradeOperation.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const assessMock = assessOperation as unknown as ReturnType<typeof vi.fn>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

function line(over: Record<string, unknown> = {}) {
  return {
    id: "l1",
    item: {
      name: "Star tracker",
      eccnEU: "9A515.a",
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    },
    appliedLicense: {
      id: "lic1",
      status: "ACTIVE",
      conditions: { coveredCodes: ["9A515"], coveredCountries: ["FR"] },
    },
    ...over,
  };
}

function operationRow(over: Record<string, unknown> = {}) {
  return {
    id: "op1",
    shipToCountry: "FR",
    endUseCountry: null,
    catchAllArt4Hit: false,
    catchAllArt5Hit: false,
    catchAllArt9Hit: false,
    catchAllArt10Hit: false,
    para9NuclearHit: false,
    para9MilitaryHit: false,
    notificationDuty: false,
    counterparty: {
      legalName: "Acme Space SAS",
      screeningStatus: "CLEAR",
      status: "ACTIVE",
      lastScreenedAt: new Date(),
    },
    lines: [line()],
    ...over,
  };
}

function goVerdict(over: Record<string, unknown> = {}) {
  return {
    operationId: "op1",
    counterpartyId: "tp1",
    verdict: "GO",
    headline: "🟢 Darf liefern",
    steps: [],
    pendenzen: [],
    lines: [],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("evaluateShipGate — GO path", () => {
  it("passes when verdict GO, all lines covered, screening CLEAR, no catch-all", async () => {
    findFirst.mockResolvedValue(operationRow());
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });

    expect(result.value.passed).toBe(true);
    expect(result.value.hardBlocked).toBe(false);
    expect(result.value.reasons).toEqual([]);
    expect(result.confidence).toBe("HIGH");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.override.allowed).toBe(false);
    // ExplainedResult envelope is fully populated → <ExplainedPanel> renders.
    expect(result.what).not.toBe("");
    expect(result.why).not.toBe("");
    expect(result.wherefore).not.toBe("");
  });
});

describe("evaluateShipGate — not-GO / REVIEW path", () => {
  it("returns GAP reasons (overridable) for a REVIEW verdict", async () => {
    findFirst.mockResolvedValue(operationRow());
    assessMock.mockResolvedValue(
      goVerdict({
        verdict: "REVIEW",
        pendenzen: [{ label: "BAFA-Antrag (ELAN-K2) erstellen" }],
      }),
    );

    const result = await evaluateShipGate("op1", { organizationId: "org1" });

    expect(result.value.passed).toBe(false);
    expect(result.value.hardBlocked).toBe(false);
    expect(result.value.reasons.some((r) => r.code === "VERDICT_REVIEW")).toBe(
      true,
    );
    expect(result.override.allowed).toBe(true);
  });

  it("flags an uncovered line (no appliedLicense) as a GAP", async () => {
    findFirst.mockResolvedValue(
      operationRow({ lines: [line({ appliedLicense: null })] }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });

    expect(result.value.passed).toBe(false);
    const r = result.value.reasons.find((x) => x.code === "LINE_UNCOVERED");
    expect(r).toBeDefined();
    expect(r?.severity).toBe("GAP");
    expect(r?.itemName).toBe("Star tracker");
  });

  it("flags a non-ACTIVE applied licence", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        lines: [
          line({
            appliedLicense: {
              id: "lic1",
              status: "EXPIRED",
              conditions: { coveredCodes: ["9A515"], coveredCountries: ["FR"] },
            },
          }),
        ],
      }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some((r) => r.code === "LICENSE_NOT_ACTIVE"),
    ).toBe(true);
    expect(result.value.passed).toBe(false);
  });

  it("flags a licence that does not cover the line code", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        lines: [
          line({
            appliedLicense: {
              id: "lic1",
              status: "ACTIVE",
              conditions: { coveredCodes: ["6A008"], coveredCountries: ["FR"] },
            },
          }),
        ],
      }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some((r) => r.code === "LICENSE_CODE_NOT_COVERED"),
    ).toBe(true);
  });

  it("flags a licence that does not cover the destination", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        shipToCountry: "CN",
        lines: [
          line({
            appliedLicense: {
              id: "lic1",
              status: "ACTIVE",
              conditions: { coveredCodes: ["9A515"], coveredCountries: ["FR"] },
            },
          }),
        ],
      }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some((r) => r.code === "LICENSE_DEST_NOT_COVERED"),
    ).toBe(true);
  });

  it("treats an EMPTY coveredCodes as covering nothing (fail closed)", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        lines: [
          line({
            appliedLicense: {
              id: "lic1",
              status: "ACTIVE",
              conditions: { coveredCodes: [], coveredCountries: ["FR"] },
            },
          }),
        ],
      }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some((r) => r.code === "LICENSE_CODE_NOT_COVERED"),
    ).toBe(true);
  });

  it("flags an open §8-AWV notification duty", async () => {
    findFirst.mockResolvedValue(operationRow({ notificationDuty: true }));
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some((r) => r.code === "NOTIFICATION_DUTY_OPEN"),
    ).toBe(true);
    expect(result.value.passed).toBe(false);
  });

  it("flags an active catch-all hit even when a licence is attached", async () => {
    findFirst.mockResolvedValue(
      operationRow({ catchAllArt4Hit: true, notificationDuty: false }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(result.value.reasons.some((r) => r.code === "CATCH_ALL_OPEN")).toBe(
      true,
    );
  });
});

describe("evaluateShipGate — BLOCKED / hard-block path", () => {
  it("marks a BLOCKED verdict as hardBlocked (non-overridable)", async () => {
    findFirst.mockResolvedValue(operationRow());
    assessMock.mockResolvedValue(goVerdict({ verdict: "BLOCKED" }));

    const result = await evaluateShipGate("op1", { organizationId: "org1" });

    expect(result.value.passed).toBe(false);
    expect(result.value.hardBlocked).toBe(true);
    expect(result.value.reasons.some((r) => r.code === "VERDICT_BLOCKED")).toBe(
      true,
    );
    expect(result.override.allowed).toBe(false);
  });

  it("marks a confirmed sanctions hit as a BLOCKING reason", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        counterparty: {
          legalName: "Sanctioned Co",
          screeningStatus: "CONFIRMED_HIT",
          status: "BLOCKED",
          lastScreenedAt: new Date(),
        },
      }),
    );
    assessMock.mockResolvedValue(goVerdict({ verdict: "BLOCKED" }));

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    const r = result.value.reasons.find(
      (x) => x.code === "SCREENING_NOT_CLEAR",
    );
    expect(r?.severity).toBe("BLOCKING");
    expect(result.value.hardBlocked).toBe(true);
  });
});

describe("evaluateShipGate — fail-closed on engine error", () => {
  it("degrades an assessOperation throw to a BLOCKING ENGINE_ERROR, never a pass", async () => {
    findFirst.mockResolvedValue(operationRow());
    assessMock.mockRejectedValue(new Error("engine exploded"));

    const result = await evaluateShipGate("op1", { organizationId: "org1" });

    expect(result.value.passed).toBe(false);
    expect(result.value.hardBlocked).toBe(true);
    expect(result.value.reasons.some((r) => r.code === "ENGINE_ERROR")).toBe(
      true,
    );
  });

  it("rethrows OperationNotFoundError when the operation row is missing", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      evaluateShipGate("missing", { organizationId: "org1" }),
    ).rejects.toBeInstanceOf(OperationNotFoundError);
  });

  it("downgrades a stale CLEAR screening to a GAP", async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days
    findFirst.mockResolvedValue(
      operationRow({
        counterparty: {
          legalName: "Acme Space SAS",
          screeningStatus: "CLEAR",
          status: "ACTIVE",
          lastScreenedAt: old,
        },
      }),
    );
    assessMock.mockResolvedValue(goVerdict());

    const result = await evaluateShipGate("op1", { organizationId: "org1" });
    expect(
      result.value.reasons.some(
        (r) => r.code === "SCREENING_NOT_CLEAR" && r.severity === "GAP",
      ),
    ).toBe(true);
  });
});

describe("composeExplained — envelope invariants", () => {
  function value(over: Partial<ShipGatePreconditionValue> = {}) {
    return {
      operationId: "op1",
      passed: false,
      hardBlocked: false,
      verdict: "REVIEW" as const,
      reasons: [
        {
          code: "VERDICT_REVIEW" as const,
          message: "x",
          severity: "GAP" as const,
        },
      ],
      ...over,
    };
  }

  it("a passed result has override.allowed=false and a non-empty envelope", () => {
    const r = composeExplained(
      "op1",
      value({ passed: true, verdict: "GO", reasons: [] }),
    );
    expect(r.override.allowed).toBe(false);
    expect(r.what && r.why && r.wherefore).toBeTruthy();
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it("a GAP result is overridable; a hard-block is not", () => {
    expect(composeExplained("op1", value()).override.allowed).toBe(true);
    expect(
      composeExplained(
        "op1",
        value({
          hardBlocked: true,
          verdict: "BLOCKED",
          reasons: [
            {
              code: "VERDICT_BLOCKED",
              message: "blocked",
              severity: "BLOCKING",
            },
          ],
        }),
      ).override.allowed,
    ).toBe(false);
  });

  it("never emits empty sources while confidence is HIGH (panel would refuse otherwise)", () => {
    const r = composeExplained("op1", value());
    expect(r.confidence).toBe("HIGH");
    expect(r.sources.length).toBeGreaterThan(0);
  });
});
