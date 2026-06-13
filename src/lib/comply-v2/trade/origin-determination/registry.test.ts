/**
 * Phase F (F2) — origin-module registry.
 *
 * `resolveOriginModule(routing)` returns the registered module for the
 * routing's primary regime (dual-use, else military), or `null` when no
 * module is registered — so the engine falls back to Gate 4.5.
 *
 * Phase F registers ONLY the US module (the behaviour-identical wrap, F4); the
 * M-* origins register later. Until a module is registered, a supported
 * circle-A origin resolves to `null` (Gate 4.5 fallback stays intact).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { ORIGIN_MODULES, resolveOriginModule } from "./registry";

describe("resolveOriginModule", () => {
  it("returns the US module for a US-origin routing (registered in F4)", () => {
    const mod = resolveOriginModule(originRegimes("US"));
    expect(mod).not.toBeNull();
    expect(typeof mod).toBe("function");
  });

  it("returns null for an unsupported origin (e.g. BR)", () => {
    const routing = originRegimes("BR");
    expect(routing.supported).toBe(false);
    expect(resolveOriginModule(routing)).toBeNull();
  });

  it("returns the UK module for a GB-origin routing (registered in M-UK)", () => {
    // M-UK registered the UK module under UK_STRATEGIC (GB's dual-use + military
    // primary regime). GB no longer resolves to null / Gate 4.5.
    const routing = originRegimes("GB");
    expect(routing.supported).toBe(true);
    const mod = resolveOriginModule(routing);
    expect(mod).not.toBeNull();
    expect(typeof mod).toBe("function");
  });

  it("returns the EU module for a supported EU origin (DE, registered in M-EU)", () => {
    const routing = originRegimes("DE");
    expect(routing.supported).toBe(true);
    const mod = resolveOriginModule(routing);
    expect(mod).not.toBeNull();
    expect(typeof mod).toBe("function");
  });

  it("returns the EU module for every EU member origin (FR, IT, NL — same EU_ANNEX_I regime)", () => {
    for (const iso of ["FR", "IT", "NL"]) {
      expect(resolveOriginModule(originRegimes(iso)), `${iso}`).not.toBeNull();
    }
  });

  it("returns the CH module for a supported CH origin (CH, registered in M-CH)", () => {
    const routing = originRegimes("CH");
    expect(routing.supported).toBe(true);
    const mod = resolveOriginModule(routing);
    expect(mod).not.toBeNull();
    expect(typeof mod).toBe("function");
  });

  it("returns null for a supported origin with no module yet (NO — M-NO not built)", () => {
    const routing = originRegimes("NO");
    expect(routing.supported).toBe(true);
    expect(resolveOriginModule(routing)).toBeNull();
  });

  it("the registry holds US_CCL + EU_ANNEX_I + UK_STRATEGIC + CH_GKV (US wrap + M-EU + M-UK + M-CH); other origins register later", () => {
    expect([...ORIGIN_MODULES.keys()].sort()).toEqual([
      "CH_GKV",
      "EU_ANNEX_I",
      "UK_STRATEGIC",
      "US_CCL",
    ]);
  });
});
