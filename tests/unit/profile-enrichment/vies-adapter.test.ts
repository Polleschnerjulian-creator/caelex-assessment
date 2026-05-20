import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import {
  lookupViesByVat,
  lookupViesByCountryCode,
  __resetViesCache,
} from "@/lib/profile-enrichment/vies-adapter";

// ─── Mock fetch ─────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function mockFetchOnce(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response);
}

function mockFetchRejectsOnce(error: Error | string) {
  globalThis.fetch = vi
    .fn()
    .mockRejectedValueOnce(error instanceof Error ? error : new Error(error));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  __resetViesCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("VIES adapter — happy path", () => {
  it("returns name + address + status for a valid DE VAT", async () => {
    mockFetchOnce({
      isValid: true,
      requestDate: "2026-05-20T10:00:00Z",
      userError: "VALID",
      name: "CAELEX GMBH",
      address: "Berliner Allee 1\n10115 Berlin",
      requestIdentifier: "abc",
    });

    const result = await lookupViesByVat("DE123456789");

    expect(result.source).toBe("vies");
    expect(result.error).toBeUndefined();
    expect(result.fields.legalName?.value).toBe("CAELEX GMBH");
    expect(result.fields.legalName?.confidence).toBeGreaterThan(0.9);
    expect(result.fields.countryCode?.value).toBe("DE");
    expect(result.fields.vatId?.value).toBe("DE123456789");
    expect(result.fields.entityStatus?.value).toBe("ACTIVE");
    expect(result.fields.headquartersAddress?.value).toContain("Berlin");
    expect(result.fields.headquartersAddress?.value).not.toContain("\n");
  });

  it("normalizes GR to EL on input and emits GR on output", async () => {
    mockFetchOnce({
      isValid: true,
      requestDate: "2026-05-20T10:00:00Z",
      userError: "VALID",
      name: "EXAMPLE PC",
      address: "5 Solonos, Athens",
    });

    const result = await lookupViesByCountryCode("GR", "123456789");
    expect(result.error).toBeUndefined();
    expect(result.fields.countryCode?.value).toBe("GR");
    // VAT prefix stays as VIES sees it (EL)
    expect(result.fields.vatId?.value).toBe("EL123456789");
  });

  it("strips whitespace from input VAT", async () => {
    mockFetchOnce({
      isValid: true,
      userError: "VALID",
      name: "A",
      address: "B",
    });
    const result = await lookupViesByVat("FR 123 456 789");
    expect(result.error).toBeUndefined();
    expect(result.fields.vatId?.value).toBe("FR123456789");
  });
});

describe("VIES adapter — privacy / partial data", () => {
  it("downgrades confidence when valid but no name/address (privacy law)", async () => {
    mockFetchOnce({
      isValid: true,
      userError: "VALID",
      name: "---",
      address: "---",
    });
    const result = await lookupViesByVat("ES123456789");
    expect(result.error).toBeUndefined();
    expect(result.fields.legalName).toBeUndefined();
    expect(result.fields.headquartersAddress).toBeUndefined();
    expect(result.fields.vatId).toBeDefined();
    expect(result.fields.vatId!.confidence).toBeLessThan(0.7);
  });
});

describe("VIES adapter — soft fail cases", () => {
  it("returns soft-fail when MS backend is unavailable", async () => {
    mockFetchOnce({ isValid: false, userError: "MS_UNAVAILABLE" });
    const result = await lookupViesByVat("IT123456789");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/unavailable/i);
  });

  it("returns soft-fail on INVALID_INPUT", async () => {
    mockFetchOnce({ isValid: false, userError: "INVALID_INPUT" });
    const result = await lookupViesByVat("DE0");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/malformed/i);
  });

  it("returns soft-fail when VAT is unregistered", async () => {
    mockFetchOnce({ isValid: false, userError: "VALID" });
    const result = await lookupViesByVat("DE000000000");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/not registered/i);
  });

  it("returns soft-fail on network error", async () => {
    mockFetchRejectsOnce(new Error("ECONNREFUSED"));
    const result = await lookupViesByVat("DE123456789");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/unreachable|error/i);
  });

  it("returns soft-fail on non-200 response", async () => {
    mockFetchOnce({}, { ok: false, status: 503 });
    const result = await lookupViesByVat("DE123456789");
    expect(result.fields).toEqual({});
    expect(result.error).toBeDefined();
  });
});

describe("VIES adapter — input validation", () => {
  it("rejects malformed VAT (no country prefix)", async () => {
    const result = await lookupViesByVat("123");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Invalid VAT format/i);
  });

  it("rejects non-EU country code", async () => {
    const result = await lookupViesByCountryCode("US", "123456789");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/not an EU member state/i);
  });

  it("rejects empty VAT number", async () => {
    const result = await lookupViesByCountryCode("DE", "");
    expect(result.fields).toEqual({});
    expect(result.error).toMatch(/Empty VAT/i);
  });
});

describe("VIES adapter — caching", () => {
  it("does not refetch within TTL", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        isValid: true,
        userError: "VALID",
        name: "X",
        address: "Y",
      }),
    } as unknown as Response);
    globalThis.fetch = fetchSpy;

    await lookupViesByVat("DE111111111");
    await lookupViesByVat("DE111111111");
    await lookupViesByVat("DE111111111");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
