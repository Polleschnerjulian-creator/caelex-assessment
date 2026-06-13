/**
 * Phase F (F2) — origin-module registry.
 *
 * `resolveOriginModule(routing)` returns the registered module for the
 * routing's primary regime (dual-use, else military), or `null` when no
 * module is registered — so the engine falls back to Gate 4.5.
 *
 * The map starts EMPTY in F2; modules register as they are built (US in F4,
 * the M-* origins later). Until a module is registered, even a supported
 * circle-A origin resolves to `null` (Gate 4.5 fallback stays intact).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { ORIGIN_MODULES, resolveOriginModule } from "./registry";

describe("resolveOriginModule", () => {
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

  it("the registry starts empty (modules register as built)", () => {
    expect([...ORIGIN_MODULES.keys()]).toEqual([]);
  });
});
