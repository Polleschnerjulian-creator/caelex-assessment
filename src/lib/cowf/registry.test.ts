/**
 * Workflow registry — unit tests.
 *
 * Coverage:
 *
 *   1. registerWorkflow persists def + caches in memory under both keys
 *   2. getWorkflowDefById returns null for unknown
 *   3. getWorkflowDefByName works for canonical (name, version) lookups
 *   4. registerCanonicalWorkflows registers W3
 *   5. __resetRegistryForTests clears the maps
 *   6. rehydrateDefIdsFromDb resolves missing defIds
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRegisterDef, mockFindDef } = vi.hoisted(() => ({
  mockRegisterDef: vi.fn(),
  mockFindDef: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("./instances.server", () => ({
  registerWorkflowDef: mockRegisterDef,
  findWorkflowDef: mockFindDef,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  __resetRegistryForTests,
  __test as registryTest,
  getWorkflowDefById,
  getWorkflowDefByName,
  registerCanonicalWorkflows,
  registerWorkflow,
  rehydrateDefIdsFromDb,
} from "./registry.server";
import { defineWorkflow } from "./define-workflow";
import { step } from "./steps";

beforeEach(() => {
  vi.clearAllMocks();
  __resetRegistryForTests();
  mockRegisterDef.mockResolvedValue({ id: "def_1", created: true });
  mockFindDef.mockResolvedValue(null);
});

function buildToyDef() {
  return defineWorkflow({
    name: "toy",
    version: 1,
    description: "x",
    states: ["A", "B"],
    initialState: "A",
    steps: {
      go: step.action({
        key: "go",
        from: "A",
        to: "B",
        run: vi.fn(),
      }),
    },
  });
}

describe("registerWorkflow", () => {
  it("persists def via registerWorkflowDef + indexes by both keys", async () => {
    const def = buildToyDef();
    const { defId } = await registerWorkflow(def);
    expect(defId).toBe("def_1");
    expect(getWorkflowDefById("def_1")).toBe(def);
    expect(getWorkflowDefByName("toy", 1)).toBe(def);
  });
});

describe("getWorkflowDefById / getWorkflowDefByName", () => {
  it("returns null for unknown defId", () => {
    expect(getWorkflowDefById("missing")).toBeNull();
  });
  it("returns null for unknown (name, version)", () => {
    expect(getWorkflowDefByName("ghost", 1)).toBeNull();
  });
});

describe("__resetRegistryForTests", () => {
  it("clears both maps", async () => {
    await registerWorkflow(buildToyDef());
    expect(registryTest.byDefId.size).toBe(1);
    __resetRegistryForTests();
    expect(registryTest.byDefId.size).toBe(0);
    expect(registryTest.byNameVersion.size).toBe(0);
  });
});

describe("registerCanonicalWorkflows", () => {
  it("registers the W3 Continuous Heartbeat workflow", async () => {
    mockRegisterDef.mockResolvedValueOnce({ id: "def_w3", created: true });
    const result = await registerCanonicalWorkflows();
    expect(result.count).toBe(1);
    expect(result.defIds).toEqual(["def_w3"]);
    // W3 should now be findable under its canonical (name, version)
    expect(
      getWorkflowDefByName("continuous-compliance-heartbeat", 1),
    ).not.toBeNull();
  });
});

describe("rehydrateDefIdsFromDb", () => {
  it("resolves missing defIds from the DB by (name, version)", async () => {
    // Manually populate byNameVersion without byDefId by using a side-channel:
    // call registerWorkflow first, then invalidate byDefId to simulate post-restart
    const def = buildToyDef();
    await registerWorkflow(def);
    registryTest.byDefId.delete("def_1");

    mockFindDef.mockResolvedValueOnce({
      id: "def_1_resolved",
      version: 1,
      states: ["A", "B"],
    });
    const { resolved } = await rehydrateDefIdsFromDb();
    expect(resolved).toBe(1);
    expect(getWorkflowDefById("def_1_resolved")).toBe(def);
  });
});
