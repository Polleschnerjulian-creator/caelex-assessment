/**
 * COWF — defineWorkflow() factory (Sprint 3B)
 *
 * Top-level DSL function. Accepts a workflow spec (states + steps), runs
 * graph-consistency validation, and returns a `WorkflowDef` that can be:
 *
 *   1. Registered into the database via `registerWorkflowDef()` (the
 *      `stored` half — JSONB-serialised step shapes)
 *   2. Used at runtime by the engine to look up handlers (the `handlers`
 *      half — kept in memory, indexed by stepKey)
 *
 * **Validation pass at definition time:**
 *
 *   - Step keys are unique within the workflow
 *   - Every step's `from` state exists in `states`
 *   - Every step's `to` state exists in `states`
 *   - `initialState` exists in `states`
 *   - `decision.branches[*].step` references exist as step keys
 *   - `waitForEvent.onTimeout` references exist as step keys
 *   - At least one step transitions OUT of `initialState`
 *
 * Validation fails LOUD — throws `WorkflowDefinitionError` so a misdef
 * never makes it into Production. CI catches this via the unit tests
 * we ship for each canonical workflow.
 *
 * Reference: docs/CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md (Section 5)
 */

import type { DefineWorkflowInput, WorkflowSubject } from "./types";
import type { StepHandle, StepHandlers } from "./steps";

// ─── Errors ────────────────────────────────────────────────────────────────

export class WorkflowDefinitionError extends Error {
  readonly issues: string[];
  constructor(workflowName: string, issues: string[]) {
    super(
      `Workflow "${workflowName}" failed validation:\n` +
        issues.map((i) => `  - ${i}`).join("\n"),
    );
    this.name = "WorkflowDefinitionError";
    this.issues = issues;
  }
}

// ─── defineWorkflow ────────────────────────────────────────────────────────

export interface DefineWorkflowConfig {
  name: string;
  version: number;
  description: string;
  states: readonly string[];
  initialState: string;
  subjectType?: WorkflowSubject["type"];
  /** Step factory results — each is a StepHandle from the steps module. */
  steps: Record<string, StepHandle>;
}

export interface WorkflowDef {
  /** Persistable shape — feed to `registerWorkflowDef()` from instances.server. */
  storedInput: DefineWorkflowInput;
  /** Lookup of handlers by step key — used by Sprint 3D's executor. */
  handlers: Map<string, StepHandlers>;
  /** Convenience accessors for engine + UI. */
  meta: {
    name: string;
    version: number;
    states: readonly string[];
    initialState: string;
    stepKeys: readonly string[];
  };
}

export function defineWorkflow(config: DefineWorkflowConfig): WorkflowDef {
  // 1. Collect step entries (key → handle)
  const stepEntries = Object.entries(config.steps);

  // 2. Validate
  const issues = validate(config, stepEntries);
  if (issues.length > 0) {
    throw new WorkflowDefinitionError(config.name, issues);
  }

  // 3. Build stored representation
  const storedSteps = stepEntries.map(([key, handle]) => {
    // Defensive: the factory may have used a different key than the map.
    // Keep the map-key as canonical since that's what runtime references use.
    return { ...handle.stored, key };
  });

  // 4. Build handlers map
  const handlers = new Map<string, StepHandlers>();
  for (const [key, handle] of stepEntries) {
    handlers.set(key, handle.handlers);
  }

  return {
    storedInput: {
      name: config.name,
      version: config.version,
      description: config.description,
      states: [...config.states],
      steps: storedSteps,
      subjectType: config.subjectType,
    },
    handlers,
    meta: {
      name: config.name,
      version: config.version,
      states: config.states,
      initialState: config.initialState,
      stepKeys: stepEntries.map(([k]) => k),
    },
  };
}

// ─── Validation ────────────────────────────────────────────────────────────

function validate(
  config: DefineWorkflowConfig,
  stepEntries: Array<[string, StepHandle]>,
): string[] {
  const issues: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    issues.push("name must be non-empty");
  }
  if (!Number.isInteger(config.version) || config.version < 1) {
    issues.push("version must be a positive integer");
  }
  if (!config.states || config.states.length === 0) {
    issues.push("states must be a non-empty array");
  }
  if (!config.initialState) {
    issues.push("initialState is required");
  }

  const stateSet = new Set(config.states);
  if (config.initialState && !stateSet.has(config.initialState)) {
    issues.push(
      `initialState "${config.initialState}" not in states [${[...stateSet].join(", ")}]`,
    );
  }

  // Step-key uniqueness is structurally guaranteed by the steps-as-record
  // shape (Object map), but we double-check via the entries array length.
  const seenKeys = new Set<string>();
  for (const [key] of stepEntries) {
    if (seenKeys.has(key)) {
      issues.push(`duplicate step key "${key}"`);
    }
    seenKeys.add(key);
  }

  // For each step, check from / to are in states
  for (const [key, handle] of stepEntries) {
    const stored = handle.stored;
    if (stored.from && !stateSet.has(stored.from)) {
      issues.push(
        `step "${key}" has from "${stored.from}" which is not in states`,
      );
    }
    if (stored.to && !stateSet.has(stored.to)) {
      issues.push(`step "${key}" has to "${stored.to}" which is not in states`);
    }
  }

  // Decision branches — branch.step must exist as a step key
  for (const [key, handle] of stepEntries) {
    if (handle.stored.kind === "decision") {
      for (const branch of handle.stored.branches) {
        if (!seenKeys.has(branch.step)) {
          issues.push(
            `decision step "${key}" branches to non-existent step "${branch.step}"`,
          );
        }
        if (branch.to && !stateSet.has(branch.to)) {
          issues.push(
            `decision step "${key}" branch.to "${branch.to}" not in states`,
          );
        }
      }
    }
  }

  // waitForEvent.onTimeout must reference an existing step key
  for (const [key, handle] of stepEntries) {
    if (
      handle.stored.kind === "waitForEvent" &&
      handle.stored.onTimeout &&
      !seenKeys.has(handle.stored.onTimeout)
    ) {
      issues.push(
        `waitForEvent step "${key}" onTimeout "${handle.stored.onTimeout}" is not a step key`,
      );
    }
  }

  // At least one step transitions OUT of initialState (otherwise the
  // workflow is stuck on creation).
  if (config.initialState && stepEntries.length > 0) {
    const hasOutgoing = stepEntries.some(
      ([, handle]) => handle.stored.from === config.initialState,
    );
    if (!hasOutgoing) {
      issues.push(
        `no step transitions out of initialState "${config.initialState}" — the workflow would be stuck`,
      );
    }
  }

  return issues;
}
