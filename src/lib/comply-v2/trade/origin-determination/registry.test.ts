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

  it("returns null for a supported origin with no module yet (GB)", () => {
    const routing = originRegimes("GB");
    expect(routing.supported).toBe(true);
    expect(resolveOriginModule(routing)).toBeNull();
  });

  it("returns null for a supported EU origin with no module yet (DE)", () => {
    const routing = originRegimes("DE");
    expect(routing.supported).toBe(true);
    expect(resolveOriginModule(routing)).toBeNull();
  });

  it("the registry holds only US_CCL in Phase F (others register later)", () => {
    expect([...ORIGIN_MODULES.keys()]).toEqual(["US_CCL"]);
  });
});
