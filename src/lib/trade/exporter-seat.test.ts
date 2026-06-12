import { describe, expect, it } from "vitest";
import { resolveExporterSeat } from "./exporter-seat";

describe("resolveExporterSeat", () => {
  it("reads billingAddress.country as ISO-2", () => {
    expect(resolveExporterSeat({ billingAddress: { country: "FR" } })).toBe(
      "FR",
    );
    expect(resolveExporterSeat({ billingAddress: { country: " gb " } })).toBe(
      "GB",
    );
  });
  it("maps common full names defensively", () => {
    expect(
      resolveExporterSeat({ billingAddress: { country: "Germany" } }),
    ).toBe("DE");
    expect(
      resolveExporterSeat({ billingAddress: { country: "Deutschland" } }),
    ).toBe("DE");
    expect(
      resolveExporterSeat({ billingAddress: { country: "United Kingdom" } }),
    ).toBe("GB");
  });
  it("returns null when absent/unparseable — NIE ein Default-Land erfinden", () => {
    expect(resolveExporterSeat({ billingAddress: null })).toBeNull();
    expect(resolveExporterSeat({})).toBeNull();
    expect(
      resolveExporterSeat({ billingAddress: { country: "Atlantis" } }),
    ).toBeNull();
  });
  it("passes through non-circle-A ISO-2 unchanged (downstream decides support)", () => {
    expect(resolveExporterSeat({ billingAddress: { country: "BR" } })).toBe(
      "BR",
    );
  });
  it("does NOT alias UK→GB (strict ISO-2; UK resolves unsupported downstream)", () => {
    expect(resolveExporterSeat({ billingAddress: { country: "UK" } })).toBe(
      "UK",
    );
  });

  // ── Coercion guard ────────────────────────────────────────────────────────
  // billingAddress.country must be a non-empty string; non-string primitives
  // and arrays must never be coerced into a country code.
  it("rejects non-string country values — arrays and numbers return null", () => {
    expect(
      resolveExporterSeat({ billingAddress: { country: ["DE"] } }),
    ).toBeNull();
    expect(resolveExporterSeat({ billingAddress: { country: 49 } })).toBeNull();
  });

  // ── North-Korea adjacency pin ─────────────────────────────────────────────
  // Highest-consequence wrong-seat in export control: "Korea (Republic of)"
  // is South Korea (KR, circle-A ally); DPRK / North Korea must NEVER appear
  // as a resolvable seat — any path that would return "KP" is a critical bug.
  it("resolves 'Korea (Republic of)' to KR — South Korea, NOT North Korea", () => {
    expect(
      resolveExporterSeat({
        billingAddress: { country: "Korea (Republic of)" },
      }),
    ).toBe("KR");
  });

  it("KP adjacency: no name-map entry resolves to KP — north-korea variants return null", () => {
    // Assert via observable behaviour: the strings that could be confused with
    // North Korea all return null (no KP entry in NAME_MAP, and "KP" itself
    // would only be returned if passed as a literal ISO-2, which is a
    // deliberately unsupported-origin signal — not a name-map output).
    const northKoreaInputs = [
      "north korea",
      "korea (democratic people's republic of)",
      "nordkorea",
    ];
    for (const input of northKoreaInputs) {
      expect(
        resolveExporterSeat({ billingAddress: { country: input } }),
        `expected "${input}" to resolve to null (not KP)`,
      ).toBeNull();
    }
  });
});
