/**
 * Workflow Engine - Core State Machine
 *
 * A generic state machine implementation for managing workflow transitions.
 * Supports auto-transitions, guards, hooks, and audit logging.
 */

import type {
  WorkflowDefinition,
  WorkflowState,
  StateDefinition,
  Transition,
  AvailableTransition,
  TransitionResult,
  EvaluationResult,
  WorkflowEngineOptions,
} from "./types";

/**
 * Default engine options
 */
const DEFAULT_OPTIONS: Required<WorkflowEngineOptions> = {
  autoEvaluate: true,
  maxAutoTransitions: 10,
  debug: false,
};

/**
 * Workflow Engine class
 *
 * Creates a state machine from a workflow definition and provides methods
 * for evaluating and executing state transitions.
 */
export class WorkflowEngine<TContext = Record<string, unknown>> {
  private definition: WorkflowDefinition<TContext>;
  private options: Required<WorkflowEngineOptions>;

  constructor(
    definition: WorkflowDefinition<TContext>,
    options: WorkflowEngineOptions = {},
  ) {
    this.definition = definition;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.validateDefinition();
  }

  /**
   * Validate the workflow definition
   */
  private validateDefinition(): void {
    const { initialState, states } = this.definition;

    if (!states[initialState]) {
      throw new Error(
        `Invalid workflow definition: initial state "${initialState}" not found in states`,
      );
    }

    // Validate all transition targets exist
    for (const [stateName, state] of Object.entries(states)) {
      for (const [event, transition] of Object.entries(state.transitions)) {
        if (!states[transition.to]) {
          throw new Error(
            `Invalid workflow definition: transition "${event}" from "${stateName}" targets unknown state "${transition.to}"`,
          );
        }
      }
    }
  }

  /**
   * Get the workflow definition
   */
  getDefinition(): WorkflowDefinition<TContext> {
    return this.definition;
  }

  /**
   * Get a state definition
   */
  getState(state: WorkflowState): StateDefinition<TContext> | undefined {
    return this.definition.states[state];
  }

  /**
   * Get all available transitions from a state
   */
  getAvailableTransitions(
    currentState: WorkflowState,
    context: TContext,
  ): AvailableTransition[] {
    const state = this.definition.states[currentState];
    if (!state) {
      return [];
    }

    const available: AvailableTransition[] = [];

    for (const [event, transition] of Object.entries(state.transitions)) {
      const conditionMet = transition.autoCondition
        ? transition.autoCondition(context)
        : true;

      available.push({
        event,
        to: transition.to,
        description: transition.description,
        auto: transition.auto ?? false,
        conditionMet,
      });
    }

    return available;
  }

  /**
   * Check if a specific transition is allowed
   */
  async canTransition(
    currentState: WorkflowState,
    event: string,
    context: TContext,
  ): Promise<boolean> {
    const state = this.definition.states[currentState];
    if (!state) {
      return false;
    }

    const transition = state.transitions[event];
    if (!transition) {
      return false;
    }

    // Check guard if present
    if (transition.guard) {
      const guardResult = await transition.guard(context);
      if (!guardResult) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a specific transition
   */
  async executeTransition(
    currentState: WorkflowState,
    event: string,
    context: TContext,
  ): Promise<TransitionResult> {
    const timestamp = new Date();
    const state = this.definition.states[currentState];

    if (!state) {
      return {
        success: false,
        previousState: currentState,
        currentState,
        transitionEvent: event,
        error: `State "${currentState}" not found in workflow`,
        timestamp,
      };
    }

    const transition = state.transitions[event];
    if (!transition) {
      return {
        success: false,
        previousState: currentState,
        currentState,
        transitionEvent: event,
        error: `Transition "${event}" not found in state "${currentState}"`,
        timestamp,
      };
    }

    // Check guard
    if (transition.guard) {
      try {
        const guardResult = await transition.guard(context);
        if (!guardResult) {
          return {
            success: false,
            previousState: currentState,
            currentState,
            transitionEvent: event,
            error: "Transition guard rejected the transition",
            timestamp,
          };
        }
      } catch (error) {
        return {
          success: false,
          previousState: currentState,
          currentState,
          transitionEvent: event,
          error: `Guard error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp,
        };
      }
    }

    const targetState = transition.to;

    try {
      // Execute beforeTransition hook
      if (this.definition.hooks?.beforeTransition) {
        await this.definition.hooks.beforeTransition({
          ...context,
          from: currentState,
          to: targetState,
        });
      }

      // Execute onExit for current state
      if (state.onExit) {
        await state.onExit(context);
      }

      // Execute transition action
      if (transition.onTransition) {
        await transition.onTransition(context);
      }

      // Execute onEnter for target state
      const targetStateDef = this.definition.states[targetState];
      if (targetStateDef?.onEnter) {
        await targetStateDef.onEnter(context);
      }

      // Execute afterTransition hook
      if (this.definition.hooks?.afterTransition) {
        await this.definition.hooks.afterTransition({
          ...context,
          from: currentState,
          to: targetState,
        });
      }

      if (this.options.debug) {
        // Debug output guarded by options flag — intentional development aid
        console.debug(
          `[Workflow ${this.definition.id}] Transition: ${currentState} --[${event}]--> ${targetState}`,
        );
      }

      return {
        success: true,
        previousState: currentState,
        currentState: targetState,
        transitionEvent: event,
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Execute error hook
      if (this.definition.hooks?.onError) {
        await this.definition.hooks.onError(
          error instanceof Error ? error : new Error(errorMessage),
          context,
        );
      }

      return {
        success: false,
        previousState: currentState,
        currentState,
        transitionEvent: event,
        error: errorMessage,
        timestamp,
      };
    }
  }

  /**
   * Evaluate and execute auto-transitions
   *
   * This method checks all auto-transitions from the current state
   * and executes them if their conditions are met.
   */
  async evaluateTransitions(
    currentState: WorkflowState,
    context: TContext,
  ): Promise<EvaluationResult> {
    const result: EvaluationResult = {
      transitioned: false,
      transitions: [],
      finalState: currentState,
      errors: [],
    };

    let state = currentState;
    let iterationCount = 0;

    while (iterationCount < this.options.maxAutoTransitions) {
      const stateDef = this.definition.states[state];
      if (!stateDef) {
        break;
      }

      // Find auto-transitions with met conditions
      let autoTransitionFound = false;

      for (const [event, transition] of Object.entries(stateDef.transitions)) {
        if (!transition.auto || !transition.autoCondition) {
          continue;
        }

        // Check if condition is met
        if (!transition.autoCondition(context)) {
          continue;
        }

        // Execute the transition
        const transitionResult = await this.executeTransition(
          state,
          event,
          context,
        );

        if (transitionResult.success) {
          result.transitioned = true;
          result.transitions.push(transitionResult);
          state = transitionResult.currentState;
          autoTransitionFound = true;
          break; // Only execute one auto-transition per iteration
        } else if (transitionResult.error) {
          result.errors.push(transitionResult.error);
        }
      }

      if (!autoTransitionFound) {
        break;
      }

      iterationCount++;
    }

    if (iterationCount >= this.options.maxAutoTransitions) {
      result.errors.push(
        `Maximum auto-transitions (${this.options.maxAutoTransitions}) reached. Possible infinite loop.`,
      );
    }

    result.finalState = state;
    return result;
  }

  /**
   * Get the next expected states (non-terminal states that can be reached)
   */
  getNextStates(currentState: WorkflowState): WorkflowState[] {
    const state = this.definition.states[currentState];
    if (!state) {
      return [];
    }

    const nextStates = new Set<WorkflowState>();
    for (const transition of Object.values(state.transitions)) {
      nextStates.add(transition.to);
    }

    return Array.from(nextStates);
  }

  /**
   * Check if a state is terminal (no outgoing transitions)
   */
  isTerminalState(state: WorkflowState): boolean {
    const stateDef = this.definition.states[state];
    if (!stateDef) {
      return true;
    }

    return (
      stateDef.metadata?.isTerminal === true ||
      Object.keys(stateDef.transitions).length === 0
    );
  }

  /**
   * Get all states in the workflow
   */
  getAllStates(): WorkflowState[] {
    return Object.keys(this.definition.states);
  }

  /**
   * Get terminal states
   */
  getTerminalStates(): WorkflowState[] {
    return this.getAllStates().filter((state) => this.isTerminalState(state));
  }
}

/**
 * Factory function to create a workflow engine
 */
export function createWorkflowEngine<TContext = Record<string, unknown>>(
  definition: WorkflowDefinition<TContext>,
  options?: WorkflowEngineOptions,
): WorkflowEngine<TContext> {
  return new WorkflowEngine(definition, options);
}

/**
 * Utility to create a simple transition
 */
export function createTransition<TContext>(
  to: WorkflowState,
  options?: Partial<Omit<Transition<TContext>, "to">>,
): Transition<TContext> {
  return {
    to,
    ...options,
  };
}

/**
 * Utility to create an auto-transition
 */
export function createAutoTransition<TContext>(
  to: WorkflowState,
  condition: (context: TContext) => boolean,
  options?: Partial<
    Omit<Transition<TContext>, "to" | "auto" | "autoCondition">
  >,
): Transition<TContext> {
  return {
    to,
    auto: true,
    autoCondition: condition,
    ...options,
  };
}
