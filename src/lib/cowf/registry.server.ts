/**
 * COWF Workflow Registry — global lookup for in-memory handlers (Sprint 3D)
 *
 * The registry is the bridge between the persistent half of a workflow
 * (`OperatorWorkflowDef.steps` JSONB) and the runtime half (TypeScript
 * closures from the DSL — `step.action({ run: ... })`).
 *
 * **Why we need this:**
 *
 *   The DSL (`defineWorkflow()` in Sprint 3B) returns a `WorkflowDef` with
 *   a `handlers` Map<stepKey, StepHandlers>. That map is in memory only —
 *   it doesn't survive a JSON round-trip. So at runtime, when the engine
 *   needs to invoke `step.action.run(ctx)` for a workflow that started 6
 *   months ago, it can't reconstruct the closure from the DB.
 *
 *   Solution: every workflow definition the app ships is registered into
 *   THIS registry on app startup. The executor looks up the def by
 *   `defId` (or `name + version`) and pulls the handlers from the
 *   registered WorkflowDef rather than the DB.
 *
 *   Old workflow instances (from before a code redeploy) work because
 *   `WorkflowDef.version` is pinned to the instance — bumping the
 *   version creates a new registry entry, old instances continue using
 *   the old handlers (or fail loudly if the old version isn't registered).
 *
 * **Lifecycle:**
 *
 *   1. App boot → register canonical workflows: `registerCanonicalWorkflows()`
 *   2. Persisted workflow defs are upserted into Postgres if missing
 *   3. Executor calls `getWorkflowDef(defId)` to get handlers
 *
 * **Thread-safety:** Node.js single-threaded by construction. The registry
 * is a module-level Map; the only mutations are during boot (synchronous)
 * and during testing (vi.clearAllMocks() in afterEach). No locks needed.
 */

import "server-only";

import { logger } from "@/lib/logger";
import type { WorkflowDef } from "./define-workflow";
import { registerWorkflowDef, findWorkflowDef } from "./instances.server";

// ─── Internal Storage ──────────────────────────────────────────────────────

/**
 * Two-key index: by `defId` (the Postgres-assigned cuid) and by
 * `${name}::${version}` (for boot-time lookup before defId is known).
 */
const byDefId = new Map<string, WorkflowDef>();
const byNameVersion = new Map<string, WorkflowDef>();

function makeKey(name: string, version: number): string {
  return `${name}::${version}`;
}

// ─── Boot Registration ─────────────────────────────────────────────────────

/**
 * Register a single workflow into the registry. Persists the def to
 * Postgres (idempotent — re-registering an existing (name, version) is
 * a no-op DB-wise). Returns the resolved defId for runtime lookups.
 *
 * Call this for each canonical workflow at app startup. The result is
 * cached in memory; subsequent calls for the same (name, version) are
 * fast.
 */
export async function registerWorkflow(
  def: WorkflowDef,
): Promise<{ defId: string }> {
  const { storedInput, meta } = def;
  // Persist (idempotent)
  const { id: defId } = await registerWorkflowDef(storedInput);

  // Stash in memory under both keys
  byDefId.set(defId, def);
  byNameVersion.set(makeKey(meta.name, meta.version), def);

  logger.info("[cowf-registry] workflow registered", {
    defId,
    name: meta.name,
    version: meta.version,
    stepCount: meta.stepKeys.length,
  });

  return { defId };
}

/**
 * Register every workflow that ships with the app. Called from boot
 * (e.g. instrumentation hook in `next.config.js` or a one-shot DB
 * seeding script). Sprint 3D registers W3 only; later sprints add
 * W1/W2/W4-W9.
 */
export async function registerCanonicalWorkflows(): Promise<{
  count: number;
  defIds: string[];
}> {
  // Lazy-import to avoid pulling all workflow modules at registry-import
  // time (helps with tree-shaking and test isolation).
  const { continuousHeartbeatWorkflow } =
    await import("./workflows/continuous-heartbeat");
  const defIds: string[] = [];
  const registrations = [continuousHeartbeatWorkflow];

  for (const wf of registrations) {
    const { defId } = await registerWorkflow(wf);
    defIds.push(defId);
  }

  return { count: registrations.length, defIds };
}

// ─── Runtime Lookup ────────────────────────────────────────────────────────

/**
 * Get a registered WorkflowDef by its Postgres defId. Returns null if
 * the def is in the DB but not in this app version's registry — this
 * happens when an old instance points to a def whose code has been
 * removed. Caller decides whether to fail or graceful-degrade.
 */
export function getWorkflowDefById(defId: string): WorkflowDef | null {
  return byDefId.get(defId) ?? null;
}

/**
 * Get by name + version. Used during boot to look up def-rows whose
 * defId we don't yet know.
 */
export function getWorkflowDefByName(
  name: string,
  version: number,
): WorkflowDef | null {
  return byNameVersion.get(makeKey(name, version)) ?? null;
}

/**
 * Hydrate the registry from the database. Useful after a process restart
 * if `registerCanonicalWorkflows()` hasn't run yet. Looks up each
 * (name, version) we have in-memory + finds its defId. Idempotent.
 */
export async function rehydrateDefIdsFromDb(): Promise<{ resolved: number }> {
  let resolved = 0;
  for (const [key, def] of byNameVersion) {
    const [name, versionStr] = key.split("::");
    const row = await findWorkflowDef(name, Number(versionStr));
    if (row && !byDefId.has(row.id)) {
      byDefId.set(row.id, def);
      resolved += 1;
    }
  }
  return { resolved };
}

// ─── Test Helpers ──────────────────────────────────────────────────────────

/** Clear the registry — only for unit tests. */
export function __resetRegistryForTests(): void {
  byDefId.clear();
  byNameVersion.clear();
}

/** Internal accessors for tests + debugging. Not part of the public API. */
export const __test = { byDefId, byNameVersion };
