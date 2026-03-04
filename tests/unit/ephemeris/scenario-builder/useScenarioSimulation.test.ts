import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../mocks/server";
import { useScenarioSimulation } from "@/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation";
import type { PipelineBlockInstance } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/csrf-client", () => ({
  csrfHeaders: () => ({ "x-csrf-token": "test" }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(
  overrides: Partial<PipelineBlockInstance> = {},
): PipelineBlockInstance {
  return {
    instanceId: "block-1",
    definitionId: "orbit-raise",
    parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
    ...overrides,
  };
}

function makeApiResponseData(overrides: Record<string, unknown> = {}) {
  return {
    scenario: {
      type: "ORBIT_RAISE",
      parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
    },
    baselineHorizon: 847,
    projectedHorizon: 912,
    horizonDelta: 65,
    affectedRegulations: [
      {
        regulationRef: "CA Art.12",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: "2027-06-15",
      },
    ],
    fuelImpact: { before: 34, after: 32, delta: -2 },
    recommendation: "Orbit raise gains 65 days.",
    ...overrides,
  };
}

// Track intercepted request bodies for assertions
let capturedRequests: Array<{ url: string; body: Record<string, unknown> }> =
  [];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useScenarioSimulation", () => {
  beforeEach(() => {
    capturedRequests = [];
  });

  // 1. Initialize with empty pipeline, null results, not running
  it("initializes with empty pipeline, null results, not running, no error", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));

    expect(result.current.pipeline).toEqual([]);
    expect(result.current.results).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // 2. addBlock adds to pipeline
  it("addBlock appends a block to the pipeline and clears results", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const block = makeBlock();

    act(() => {
      result.current.addBlock(block);
    });

    expect(result.current.pipeline).toHaveLength(1);
    expect(result.current.pipeline[0]).toEqual(block);
    expect(result.current.results).toBeNull();
  });

  // 3. removeBlock removes from pipeline
  it("removeBlock removes a block by instanceId and clears results", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const block1 = makeBlock({ instanceId: "block-1" });
    const block2 = makeBlock({
      instanceId: "block-2",
      definitionId: "fuel-burn",
    });

    act(() => {
      result.current.addBlock(block1);
      result.current.addBlock(block2);
    });

    expect(result.current.pipeline).toHaveLength(2);

    act(() => {
      result.current.removeBlock("block-1");
    });

    expect(result.current.pipeline).toHaveLength(1);
    expect(result.current.pipeline[0].instanceId).toBe("block-2");
    expect(result.current.results).toBeNull();
  });

  // 4. updateBlockParams merges params
  it("updateBlockParams merges new params into the block and clears results", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const block = makeBlock({
      parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
    });

    act(() => {
      result.current.addBlock(block);
    });

    act(() => {
      result.current.updateBlockParams("block-1", { altitudeDeltaKm: 100 });
    });

    expect(result.current.pipeline[0].parameters).toEqual({
      altitudeDeltaKm: 100,
      fuelCostPct: 2,
    });
    expect(result.current.results).toBeNull();
  });

  // 5. reorderBlocks moves block to new position
  it("reorderBlocks moves activeId to overId position", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const blockA = makeBlock({ instanceId: "a" });
    const blockB = makeBlock({ instanceId: "b" });
    const blockC = makeBlock({ instanceId: "c" });

    act(() => {
      result.current.addBlock(blockA);
      result.current.addBlock(blockB);
      result.current.addBlock(blockC);
    });

    // Move "c" to where "a" is (index 0)
    act(() => {
      result.current.reorderBlocks("c", "a");
    });

    expect(result.current.pipeline.map((b) => b.instanceId)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(result.current.results).toBeNull();
  });

  // 6. reset clears everything
  it("reset clears pipeline, results, and error", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const block = makeBlock();

    act(() => {
      result.current.addBlock(block);
    });

    expect(result.current.pipeline).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.pipeline).toEqual([]);
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // 7. runSimulation calls fetch and sets results
  it("runSimulation calls API for each non-CUSTOM block and aggregates results", async () => {
    server.use(
      http.post("*/api/v1/ephemeris/what-if", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        capturedRequests.push({ url: request.url, body });
        return HttpResponse.json({ data: makeApiResponseData() });
      }),
    );

    const { result } = renderHook(() => useScenarioSimulation("25544"));

    const orbitBlock = makeBlock({
      instanceId: "orbit-1",
      definitionId: "orbit-raise",
      parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
    });

    const customBlock = makeBlock({
      instanceId: "custom-1",
      definitionId: "custom",
      parameters: {},
    });

    act(() => {
      result.current.addBlock(orbitBlock);
      result.current.addBlock(customBlock);
    });

    await act(async () => {
      await result.current.runSimulation();
    });

    // Fetch should be called once (custom block is skipped)
    expect(capturedRequests).toHaveLength(1);

    // Verify the request body
    const reqBody = capturedRequests[0].body;
    expect(reqBody.norad_id).toBe("25544");
    expect(
      (reqBody.scenario as { type: string; parameters: unknown }).type,
    ).toBe("ORBIT_RAISE");
    expect(
      (reqBody.scenario as { type: string; parameters: unknown }).parameters,
    ).toEqual({ altitudeDeltaKm: 50, fuelCostPct: 2 });

    // Verify results are aggregated
    expect(result.current.results).not.toBeNull();
    expect(result.current.results!.stepResults).toHaveLength(1);
    expect(result.current.results!.totalHorizonDelta).toBe(65);
    expect(result.current.results!.totalFuelDelta).toBe(-2);
    expect(result.current.results!.allAffectedRegulations).toHaveLength(1);
    expect(
      result.current.results!.allAffectedRegulations[0].regulationRef,
    ).toBe("CA Art.12");
    expect(result.current.results!.finalRecommendation).toBe(
      "Orbit raise gains 65 days.",
    );
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // 8. runSimulation handles API error
  it("runSimulation sets error when API returns non-ok response", async () => {
    server.use(
      http.post("*/api/v1/ephemeris/what-if", () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      }),
    );

    const { result } = renderHook(() => useScenarioSimulation("25544"));

    act(() => {
      result.current.addBlock(makeBlock());
    });

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.results).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  // 9. runSimulation aggregates multiple blocks
  it("runSimulation aggregates results from multiple blocks correctly", async () => {
    let callCount = 0;

    server.use(
      http.post("*/api/v1/ephemeris/what-if", () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({
            data: makeApiResponseData({
              horizonDelta: 65,
              fuelImpact: { before: 34, after: 32, delta: -2 },
              affectedRegulations: [
                {
                  regulationRef: "CA Art.12",
                  statusBefore: "COMPLIANT",
                  statusAfter: "WARNING",
                  crossingDateBefore: null,
                  crossingDateAfter: "2027-06-15",
                },
              ],
              recommendation: "Orbit raise gains 65 days.",
            }),
          });
        }
        return HttpResponse.json({
          data: makeApiResponseData({
            horizonDelta: -10,
            fuelImpact: { before: 32, after: 27, delta: -5 },
            affectedRegulations: [
              {
                regulationRef: "CA Art.12",
                statusBefore: "WARNING",
                statusAfter: "NON_COMPLIANT",
                crossingDateBefore: "2027-06-15",
                crossingDateAfter: "2026-12-01",
              },
            ],
            recommendation: "Fuel burn reduces horizon by 10 days.",
          }),
        });
      }),
    );

    const { result } = renderHook(() => useScenarioSimulation("25544"));

    act(() => {
      result.current.addBlock(
        makeBlock({ instanceId: "orbit-1", definitionId: "orbit-raise" }),
      );
      result.current.addBlock(
        makeBlock({ instanceId: "fuel-1", definitionId: "fuel-burn" }),
      );
    });

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(result.current.results).not.toBeNull();
    expect(result.current.results!.stepResults).toHaveLength(2);
    // Sum of horizon deltas: 65 + (-10) = 55
    expect(result.current.results!.totalHorizonDelta).toBe(55);
    // Sum of fuel deltas: -2 + (-5) = -7
    expect(result.current.results!.totalFuelDelta).toBe(-7);
    // CA Art.12 should be deduplicated — keep last status
    expect(result.current.results!.allAffectedRegulations).toHaveLength(1);
    expect(result.current.results!.allAffectedRegulations[0].statusAfter).toBe(
      "NON_COMPLIANT",
    );
    // Recommendations joined
    expect(result.current.results!.finalRecommendation).toBe(
      "Orbit raise gains 65 days. Fuel burn reduces horizon by 10 days.",
    );
  });
});
