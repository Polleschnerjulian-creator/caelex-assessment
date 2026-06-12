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
});
