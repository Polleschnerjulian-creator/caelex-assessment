"use client";

/**
 * Atlas Drafting Chat — client-side action executor (Bundle 46).
 *
 * The chat backend (engine.server.ts) returns a list of ClientAction
 * records that represent state mutations the browser must apply against
 * its localStorage stores. This module is the dispatch table.
 *
 * Each action maps 1:1 to an existing helper in the relevant store
 * (mandate-store, plan-workspace-store, drafting-history). Order matters
 * — apply in the order returned by the engine, since later actions may
 * depend on state created by earlier ones (e.g. set_plan_item_body
 * after instantiate_plan).
 *
 * Errors during application are logged + swallowed so a single bad
 * action doesn't tank the whole batch. The chat UI re-syncs from
 * localStorage after applyActions() returns, so any failures surface
 * as "thing didn't get created" rather than a crash.
 */

import {
  setActiveMandate,
  createMandate,
  updateMandate,
  deleteMandate,
} from "../mandate-store";
import {
  createPlanWorkspace,
  listPlanWorkspaces,
  savePlanWorkspace,
  type PlanItemState,
} from "../plan-workspace-store";
import { getPlanTemplate } from "../plan-templates";
import { pushDraftLibrary } from "../drafting-history";
import type { ClientAction } from "./types";

/* Apply one action. Failures are caught + logged; the caller continues
   with the rest. */
export function applyClientAction(action: ClientAction): void {
  try {
    switch (action.type) {
      case "set_active_mandate":
        setActiveMandate(action.mandateId);
        break;

      case "create_mandate":
        createMandate({
          name: action.name,
          intake: action.intake,
        });
        /* createMandate auto-activates the new mandate. The action's
           makeActive flag is informational — we always activate, since
           the LLM only calls create_mandate when it wants to switch. */
        break;

      case "update_mandate":
        updateMandate(action.mandateId, {
          name: action.name,
          intake: action.intake,
        });
        break;

      case "delete_mandate":
        deleteMandate(action.mandateId);
        break;

      case "instantiate_plan": {
        const plan = getPlanTemplate(action.planId);
        if (!plan) {
          console.warn(
            `[chat action-executor] instantiate_plan: unknown planId '${action.planId}'`,
          );
          return;
        }
        createPlanWorkspace({
          planId: plan.id,
          mandateId: action.mandateId,
          outputLang: action.outputLang,
          itemIds: plan.items.map((i) => i.id),
        });
        break;
      }

      case "set_plan_item_body": {
        const ws = listPlanWorkspaces().find(
          (w) => w.id === action.workspaceId,
        );
        if (!ws) {
          console.warn(
            `[chat action-executor] set_plan_item_body: workspace ${action.workspaceId} not found`,
          );
          return;
        }
        const prev: PlanItemState = ws.items[action.itemId] ?? {
          status: "pending",
          body: "",
          ts: 0,
        };
        const next: PlanItemState = {
          ...prev,
          body: action.body,
          status: action.status ?? "generated",
          ts: Date.now(),
        };
        savePlanWorkspace({
          ...ws,
          items: { ...ws.items, [action.itemId]: next },
        });
        break;
      }

      case "accept_plan_item": {
        const ws = listPlanWorkspaces().find(
          (w) => w.id === action.workspaceId,
        );
        if (!ws) return;
        const prev = ws.items[action.itemId];
        if (!prev) return;
        savePlanWorkspace({
          ...ws,
          items: {
            ...ws.items,
            [action.itemId]: { ...prev, status: "accepted", ts: Date.now() },
          },
        });
        break;
      }

      case "skip_plan_item": {
        const ws = listPlanWorkspaces().find(
          (w) => w.id === action.workspaceId,
        );
        if (!ws) return;
        const prev = ws.items[action.itemId];
        if (!prev) return;
        savePlanWorkspace({
          ...ws,
          items: {
            ...ws.items,
            [action.itemId]: { ...prev, status: "skipped", ts: Date.now() },
          },
        });
        break;
      }

      case "attach_clause_to_session":
      case "detach_clause_from_session":
        /* Session-state for attached clauses currently lives in the
           studio page's React state — not in a persistent store. The
           chat surface doesn't have access to it via localStorage.
           Future bundle: lift attached-clauses into a tiny store and
           wire both surfaces through it. For now, no-op. */
        console.info(
          `[chat action-executor] ${action.type} requested for clause ${action.clauseId} — deferred until clause-attachment store exists`,
        );
        break;

      case "push_to_library":
        pushDraftLibrary({
          kind: action.kind,
          title: action.title,
          prompt: action.prompt,
          outputLocale: action.outputLocale,
          privileged: action.privileged,
          mandateId: action.mandateId,
          mandateName: action.mandateName,
        });
        break;

      default: {
        /* Exhaustiveness check — TypeScript catches a missing case at
           compile time via the never-cast. */
        const _exhaustive: never = action;
        console.warn(
          `[chat action-executor] unhandled action type: ${(_exhaustive as { type: string }).type}`,
        );
      }
    }
  } catch (e) {
    console.error(
      `[chat action-executor] failed to apply action ${action.type}:`,
      e,
    );
  }
}

/** Apply a batch of actions in order. */
export function applyActions(actions: ClientAction[]): void {
  for (const a of actions) applyClientAction(a);
}
