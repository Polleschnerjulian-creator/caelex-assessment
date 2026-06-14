import { describe, it, expect } from "vitest";
import { confirmedCodeCell } from "./confirmed-code-cell";

describe("confirmedCodeCell — map a confirmed control code onto the TradeItem regime cell", () => {
  it("EU-ANNEX-I → eccnEU (bare code, prefix stripped)", () => {
    expect(
      confirmedCodeCell({ canonicalId: "EU:9A004", regime: "EU-ANNEX-I" }),
    ).toEqual({ eccnEU: "9A004" });
  });

  it("ITAR-USML → usmlCategory", () => {
    expect(
      confirmedCodeCell({ canonicalId: "USML:XV(e)(16)", regime: "ITAR-USML" }),
    ).toEqual({ usmlCategory: "XV(e)(16)" });
  });

  it("EAR-CCL → eccnUS", () => {
    expect(
      confirmedCodeCell({ canonicalId: "ECCN:9A515.a.1", regime: "EAR-CCL" }),
    ).toEqual({ eccnUS: "9A515.a.1" });
  });

  it("MTCR-ANNEX → mtcrCategory", () => {
    expect(
      confirmedCodeCell({ canonicalId: "MTCR:1.A.2", regime: "MTCR-ANNEX" }),
    ).toEqual({ mtcrCategory: "1.A.2" });
  });

  it("DE-AL-TEIL-IB → germanAlEntry", () => {
    expect(
      confirmedCodeCell({
        canonicalId: "DE-AL:0009",
        regime: "DE-AL-TEIL-IB",
      }),
    ).toEqual({ germanAlEntry: "0009" });
  });

  it("explicit eccnEU wins over regime/canonicalId derivation", () => {
    expect(
      confirmedCodeCell({
        canonicalId: "EU:9A004",
        regime: "EU-ANNEX-I",
        eccnEU: "7A004",
      }),
    ).toEqual({ eccnEU: "7A004" });
  });

  it("falls back to the canonicalId prefix when no regime is given (EU → eccnEU)", () => {
    expect(confirmedCodeCell({ canonicalId: "EU:9A004" })).toEqual({
      eccnEU: "9A004",
    });
  });

  it("falls back to the canonicalId prefix when no regime is given (ECCN → eccnUS)", () => {
    expect(confirmedCodeCell({ canonicalId: "ECCN:9A515.a.1" })).toEqual({
      eccnUS: "9A515.a.1",
    });
  });

  it("unknown regime + unknown prefix → declaredOtherCode (FAIL-CLOSED, never mis-routes onto a typed cell, never silently drops the code)", () => {
    const patch = confirmedCodeCell({
      canonicalId: "WAFFLE:42",
      regime: "OTHER",
    });
    // B2 fail-closed: the confirmed code is CARRIED so the engine treats the
    // item as controlled — it must NOT be silently dropped to {} (the old
    // fail-open that let a confirmed JP-METI/NSG/RU-833/Wassenaar item reach
    // the landscape code-less → GO incl. RU/BY).
    expect(patch).toEqual({
      declaredOtherCode: { regime: "OTHER", code: "42" },
    });
    // Invariant preserved: no TYPED regime cell is ever guessed.
    expect(patch.eccnEU).toBeUndefined();
    expect(patch.eccnUS).toBeUndefined();
    expect(patch.usmlCategory).toBeUndefined();
    expect(patch.mtcrCategory).toBeUndefined();
    expect(patch.germanAlEntry).toBeUndefined();
  });

  it("unmapped regime, no prefix in canonicalId → declaredOtherCode falls back to the regime name", () => {
    expect(
      confirmedCodeCell({ canonicalId: "9A004", regime: "JP-METI" }),
    ).toEqual({ declaredOtherCode: { regime: "JP-METI", code: "9A004" } });
  });

  it("empty / missing canonicalId → {} (no code at all — nothing to carry)", () => {
    expect(confirmedCodeCell({ canonicalId: "" })).toEqual({});
  });
});
