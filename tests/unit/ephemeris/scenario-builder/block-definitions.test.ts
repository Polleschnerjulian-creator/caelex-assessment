import { describe, it, expect } from "vitest";
import {
  BLOCK_DEFINITIONS,
  createBlockInstance,
  getDefaultParameters,
  type BlockDefinition,
} from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";

describe("BLOCK_DEFINITIONS", () => {
  it("has exactly 6 entries", () => {
    expect(BLOCK_DEFINITIONS).toHaveLength(6);
  });

  it("has all unique IDs", () => {
    const ids = BLOCK_DEFINITIONS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it.each(BLOCK_DEFINITIONS)(
    "$id has all required fields",
    (block: BlockDefinition) => {
      expect(block).toHaveProperty("id");
      expect(block).toHaveProperty("name");
      expect(block).toHaveProperty("description");
      expect(block).toHaveProperty("icon");
      expect(block).toHaveProperty("color");
      expect(block).toHaveProperty("scenarioType");
      expect(block).toHaveProperty("parameterDefs");
      expect(Array.isArray(block.parameterDefs)).toBe(true);

      expect(typeof block.id).toBe("string");
      expect(typeof block.name).toBe("string");
      expect(typeof block.description).toBe("string");
      expect(typeof block.icon).toBe("string");
      expect(typeof block.color).toBe("string");
      expect(typeof block.scenarioType).toBe("string");
    },
  );
});

describe("createBlockInstance", () => {
  it("returns unique instanceIds on successive calls", () => {
    const definition = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const instance1 = createBlockInstance(definition);
    const instance2 = createBlockInstance(definition);

    expect(instance1.instanceId).toBeDefined();
    expect(instance2.instanceId).toBeDefined();
    expect(instance1.instanceId).not.toBe(instance2.instanceId);
  });

  it("populates default parameters from definition", () => {
    const definition = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const instance = createBlockInstance(definition);

    expect(instance.definitionId).toBe("orbit-raise");
    expect(instance.parameters).toEqual({
      altitudeDeltaKm: 50,
      fuelCostPct: 2,
    });
  });

  it("returns empty parameters for blocks with no parameterDefs", () => {
    const definition = BLOCK_DEFINITIONS.find(
      (b) => b.id === "thruster-failure",
    )!;
    const instance = createBlockInstance(definition);

    expect(instance.definitionId).toBe("thruster-failure");
    expect(instance.parameters).toEqual({});
  });
});

describe("getDefaultParameters", () => {
  it("returns correct defaults for orbit-raise", () => {
    const definition = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const defaults = getDefaultParameters(definition);

    expect(defaults).toEqual({
      altitudeDeltaKm: 50,
      fuelCostPct: 2,
    });
  });

  it("returns empty object for thruster-failure (no params)", () => {
    const definition = BLOCK_DEFINITIONS.find(
      (b) => b.id === "thruster-failure",
    )!;
    const defaults = getDefaultParameters(definition);

    expect(defaults).toEqual({});
  });
});
