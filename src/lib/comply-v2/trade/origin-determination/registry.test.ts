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

  it("returns a module for every fan-out origin (NO/CA/AU/JP/KR/IN now registered)", () => {
    // The origin-determination fan-out (2026-06-13) registered the last six
    // circle-A origin modules. NO no longer resolves to null — it (and CA/AU/JP/
    // KR/IN) now flows through a real module rather than the Gate 4.5 fallback.
    for (const iso of ["NO", "CA", "AU", "JP", "KR", "IN"]) {
      const routing = originRegimes(iso);
      expect(routing.supported, `${iso} supported`).toBe(true);
      const mod = resolveOriginModule(routing);
      expect(mod, `${iso} resolves a module`).not.toBeNull();
      expect(typeof mod).toBe("function");
    }
  });

  it("every circle-A origin resolves a module — Gate 4.5 no longer the fallback for any real circle-A seat", () => {
    // After the fan-out, all eleven golden circle-A seats (DE/FR/GB/US/CH/NO/CA/
    // JP/AU/KR/IN) resolve a registered origin module — there is no real circle-A
    // origin left on the Gate-4.5 thin-origin fallback. An UNsupported origin (BR)
    // still returns null.
    for (const iso of [
      "DE",
      "FR",
      "GB",
      "US",
      "CH",
      "NO",
      "CA",
      "JP",
      "AU",
      "KR",
      "IN",
    ]) {
      expect(resolveOriginModule(originRegimes(iso)), `${iso}`).not.toBeNull();
    }
    expect(resolveOriginModule(originRegimes("BR"))).toBeNull();
  });

  it("the registry holds all 10 circle-A dual-use/military primary regimes after the fan-out", () => {
    // US wrap + M-EU + M-UK + M-CH + the NO/CA/AU/JP/KR/IN fan-out.
    expect([...ORIGIN_MODULES.keys()].sort()).toEqual([
      "AU_DSGL",
      "CA_ECL",
      "CH_GKV",
      "EU_ANNEX_I",
      "IN_SCOMET",
      "JP_METI",
      "KR_STRATEGIC",
      "NO_LIST",
      "UK_STRATEGIC",
      "US_CCL",
    ]);
  });
});
