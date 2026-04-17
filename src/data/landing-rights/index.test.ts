import { describe, it, expect } from "vitest";
import {
  getProfile,
  getDeepDives,
  getDeepDive,
  getCaseStudiesFor,
  getConductFor,
  getOperatorStatus,
  ALL_LANDING_RIGHTS_PROFILES,
} from "./index";

describe("Landing Rights lookups", () => {
  it("exports an array of profiles", () => {
    expect(Array.isArray(ALL_LANDING_RIGHTS_PROFILES)).toBe(true);
  });

  it("returns undefined for unknown jurisdiction profile", () => {
    // @ts-expect-error — testing runtime behaviour — testing runtime behaviour
    expect(getProfile("XX")).toBeUndefined();
  });

  it("returns empty array for deep-dives of unknown jurisdiction", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(getDeepDives("XX")).toEqual([]);
  });

  it("returns empty array for case studies of unknown jurisdiction", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(getCaseStudiesFor("XX")).toEqual([]);
  });

  it("returns empty array for conduct conditions of unknown jurisdiction", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(getConductFor("XX")).toEqual([]);
  });

  it("returns undefined for unknown operator status", () => {
    expect(getOperatorStatus("UnknownOp", "DE")).toBeUndefined();
  });

  it("returns undefined for unknown deep-dive category pair", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(getDeepDive("XX", "market_access")).toBeUndefined();
  });
});
