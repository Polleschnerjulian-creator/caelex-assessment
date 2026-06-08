import "server-only";
import {
  createWorkflowEngine,
  createTransition,
  type WorkflowEngine,
} from "@/lib/workflow/engine";
import type { WorkflowDefinition, StateDefinition } from "@/lib/workflow/types";
import type { ScholarPlanspielScenario } from "@/data/scholar/planspiele/types";

/**
 * Runtime context the phase-advance guards evaluate.
 *
 * `actorRole`     — the role firing the transition (operator submits, regulator approves).
 * `phaseComplete` — all mandatory artifacts present for the current phase.
 */
export interface ScholarSimContext {
  actorRole: string;
  phaseComplete: boolean;
  [k: string]: unknown;
}

export const SIM_TERMINAL = "completed";
export const SIM_ABANDONED = "abandoned";

/**
 * Build a generic WorkflowEngine for a Planspiel. States are the scenario's
 * phases (ordered) plus two terminal states. The `advance` transition is guarded
 * so ONLY the holder of the phase's `advanceRequiresRole` can fire it AND only
 * once the phase's artifacts are complete — this is what makes it a real role-play.
 *
 * The generic state machine in src/lib/workflow/ is a non-frozen lib; we add a
 * definition + thin builder, never editing the engine. Monochrome: we drop the
 * color/icon state metadata the dashboard workflows carry.
 */
export function buildScholarWorkflow(
  scenario: ScholarPlanspielScenario,
): WorkflowEngine<ScholarSimContext> {
  const phases = [...scenario.phases].sort((a, b) => a.order - b.order);
  const states: Record<string, StateDefinition<ScholarSimContext>> = {};

  phases.forEach((phase, i) => {
    const next = i + 1 < phases.length ? phases[i + 1].phaseKey : SIM_TERMINAL;
    states[phase.phaseKey] = {
      name: phase.phaseKey,
      metadata: { phase: phase.phaseKey }, // no color/icon — monochrome
      transitions: {
        advance: createTransition<ScholarSimContext>(next, {
          description: `Advance to ${next}`,
          requiredPermissions: [phase.advanceRequiresRole],
          guard: async (ctx) =>
            ctx.phaseComplete === true &&
            ctx.actorRole === phase.advanceRequiresRole,
        }),
        abandon: createTransition<ScholarSimContext>(SIM_ABANDONED, {
          description: "Abandon the run",
        }),
      },
    };
  });

  states[SIM_TERMINAL] = {
    name: SIM_TERMINAL,
    metadata: { isTerminal: true },
    transitions: {},
  };
  states[SIM_ABANDONED] = {
    name: SIM_ABANDONED,
    metadata: { isTerminal: true },
    transitions: {},
  };

  const definition: WorkflowDefinition<ScholarSimContext> = {
    id: `scholar-planspiel-${scenario.id}`,
    name: scenario.id,
    version: "1.0.0",
    initialState: phases[0].phaseKey,
    states,
  };

  return createWorkflowEngine<ScholarSimContext>(definition);
}
