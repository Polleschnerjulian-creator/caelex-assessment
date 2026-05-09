/**
 * Atlas Drafting — Plan Workspace store (Bundle 43).
 *
 * Backs `/atlas/drafting/plan/[planId]` — a multi-item workspace where
 * Marie steps through every draft in a plan template (Auth + Cover +
 * Brief + …) for a specific mandate.
 *
 * Shape parallels the bundle-42 section-workspace store:
 *   - LIST of workspaces, each keyed by composite (planId, mandateId)
 *   - Per-item state: status + body + per-item override args + ts
 *   - Defensive shape-check on hydrate
 *   - Cap to keep localStorage from blowing up
 *
 * One workspace per (plan, mandate) pair — so Sky-Sat can have an
 * "in-flight DE-Auth-Package" while Aero-Partners has a parallel
 * "in-flight ITU-Filing" without either touching the other.
 */

import type { PlanItemDefaults } from "./plan-templates";

export const PLAN_WORKSPACES_KEY = "atlas-drafting-plan-workspaces";

const PLAN_WORKSPACE_CAP = 50;

export type PlanItemStatus = "pending" | "generated" | "accepted" | "skipped";

export interface PlanItemState {
  status: PlanItemStatus;
  /** Generated/edited body. */
  body: string;
  /** Per-item override of the plan-template defaults. Empty = use the
   *  template defaults as-is. Stored as JSON-friendly partial of the
   *  PlanItemDefaults type for the same kind. */
  overrides?: Partial<PlanItemDefaults>;
  /** Last touch timestamp. */
  ts: number;
}

export interface PlanWorkspace {
  /** Composite id: `{planId}::{mandateId | "none"}`. */
  id: string;
  planId: string;
  mandateId: string | null;
  /** Output language. Locked at workspace-creation time. */
  outputLang: "de" | "en";
  /** Per-item state, keyed by PlanItem.id. */
  items: Record<string, PlanItemState>;
  createdAt: number;
  updatedAt: number;
}

export function planWorkspaceIdFor(
  planId: string,
  mandateId: string | null,
): string {
  return `${planId}::${mandateId ?? "none"}`;
}

const isStatus = (v: unknown): v is PlanItemStatus =>
  v === "pending" || v === "generated" || v === "accepted" || v === "skipped";

const isItemState = (v: unknown): v is PlanItemState =>
  typeof v === "object" &&
  v !== null &&
  isStatus((v as PlanItemState).status) &&
  typeof (v as PlanItemState).body === "string" &&
  typeof (v as PlanItemState).ts === "number";

const isWorkspace = (v: unknown): v is PlanWorkspace => {
  if (typeof v !== "object" || v === null) return false;
  const w = v as PlanWorkspace;
  if (typeof w.id !== "string") return false;
  if (typeof w.planId !== "string") return false;
  if (w.mandateId !== null && typeof w.mandateId !== "string") return false;
  if (w.outputLang !== "de" && w.outputLang !== "en") return false;
  if (typeof w.items !== "object" || w.items === null) return false;
  for (const k in w.items) {
    if (!isItemState((w.items as Record<string, unknown>)[k])) return false;
  }
  return true;
};

function readWorkspaces(): PlanWorkspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAN_WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkspace);
  } catch {
    return [];
  }
}

function writeWorkspaces(list: PlanWorkspace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PLAN_WORKSPACES_KEY,
      JSON.stringify(list.slice(0, PLAN_WORKSPACE_CAP)),
    );
  } catch {
    /* quota — silent. */
  }
}

/* Public API ─────────────────────────────────────────────────────── */

export function listPlanWorkspaces(): PlanWorkspace[] {
  return readWorkspaces();
}

export function getPlanWorkspace(
  planId: string,
  mandateId: string | null,
): PlanWorkspace | null {
  const id = planWorkspaceIdFor(planId, mandateId);
  return readWorkspaces().find((w) => w.id === id) ?? null;
}

export function savePlanWorkspace(ws: PlanWorkspace): void {
  const list = readWorkspaces();
  const next: PlanWorkspace = { ...ws, updatedAt: Date.now() };
  const without = list.filter((w) => w.id !== ws.id);
  writeWorkspaces([next, ...without]);
}

export function deletePlanWorkspace(id: string): void {
  writeWorkspaces(readWorkspaces().filter((w) => w.id !== id));
}

export function createPlanWorkspace(args: {
  planId: string;
  mandateId: string | null;
  outputLang: "de" | "en";
  itemIds: string[];
}): PlanWorkspace {
  const items: Record<string, PlanItemState> = {};
  for (const id of args.itemIds) {
    items[id] = { status: "pending", body: "", ts: 0 };
  }
  const now = Date.now();
  const ws: PlanWorkspace = {
    id: planWorkspaceIdFor(args.planId, args.mandateId),
    planId: args.planId,
    mandateId: args.mandateId,
    outputLang: args.outputLang,
    items,
    createdAt: now,
    updatedAt: now,
  };
  savePlanWorkspace(ws);
  return ws;
}

/**
 * Compose all accepted items into one combined Markdown document for
 * clipboard / export. Skipped + pending items are omitted. Each item
 * gets a `## {label}` heading.
 */
export function composePlanDraft(
  ws: PlanWorkspace,
  itemTitles: Record<string, string>,
): string {
  const parts: string[] = [];
  /* Preserve insertion order, which matches the plan-template order
     because createPlanWorkspace iterates items in plan order. */
  for (const id of Object.keys(ws.items)) {
    const s = ws.items[id];
    if (s.status === "skipped" || s.status === "pending") continue;
    parts.push(`## ${itemTitles[id] ?? id}\n\n${s.body.trim()}`);
  }
  return parts.join("\n\n---\n\n");
}
