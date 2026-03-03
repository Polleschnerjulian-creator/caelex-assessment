import { describe, it, expect } from "vitest";
import { toExternalTrust } from "@/lib/verity/utils/trust-level";

describe("toExternalTrust", () => {
  it("maps >= 0.90 to HIGH", () => {
    expect(toExternalTrust(0.9).level).toBe("HIGH");
    expect(toExternalTrust(0.98).level).toBe("HIGH");
    expect(toExternalTrust(1.0).level).toBe("HIGH");
  });

  it("maps 0.70-0.89 to MEDIUM", () => {
    expect(toExternalTrust(0.7).level).toBe("MEDIUM");
    expect(toExternalTrust(0.89).level).toBe("MEDIUM");
  });

  it("maps < 0.70 to LOW", () => {
    expect(toExternalTrust(0.5).level).toBe("LOW");
    expect(toExternalTrust(0.69).level).toBe("LOW");
    expect(toExternalTrust(0.0).level).toBe("LOW");
  });

  it("returns a range string", () => {
    const result = toExternalTrust(0.95);
    expect(result.range).toBeTruthy();
    expect(typeof result.range).toBe("string");
  });

  it("returns a description", () => {
    const result = toExternalTrust(0.75);
    expect(result.description).toBeTruthy();
    expect(typeof result.description).toBe("string");
  });
});
