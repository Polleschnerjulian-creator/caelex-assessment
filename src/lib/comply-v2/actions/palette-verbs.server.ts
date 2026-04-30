import "server-only";
import { getActionRegistry } from "./define-action";
// Side-effect imports — registers each action with the registry.
// Without these the palette starts empty.
import "./compliance-item-actions";
import "./triage-actions";

/**
 * Project the action registry into a serializable, client-safe shape
 * for the Cmd-K palette. Server Components call this and pass the
 * array to the Client Component that renders the palette.
 *
 * Why we project here instead of importing the registry directly in
 * the client: the registry holds handler functions, Zod schemas, and
 * `applyApprovedProposal` callbacks — none of which are serializable
 * across the RSC boundary. We strip everything except the metadata
 * the palette needs to render and route.
 */

export interface ServerActionVerb {
  /** Stable action name — `kebab-case`. */
  name: string;
  /** Short human description. */
  description: string;
  /** Display-time label for the palette row. */
  label: string;
  /** Optional helper text. */
  hint: string | null;
  /** Group bucket for the palette. */
  group: "navigate" | "create" | "ai" | "settings" | "item";
  /** Lucide icon name (resolved on the client side). */
  iconName: string;
  /** When true, the verb only makes sense with a selected
   *  ComplianceItem (Phase 2 wires that context). For Phase 1 we
   *  still surface the verb in the palette but skip the run path. */
  contextual: boolean;
  /** When true, executing this verb produces an AstraProposal
   *  instead of running immediately. The palette renders a "needs
   *  approval" hint so the user knows what's coming. */
  requiresApproval: boolean;
}

/**
 * All actions whose `paletteVerb` config is set, projected into
 * client-safe shape. Sorted by group then label.
 */
export function getServerActionVerbs(): ServerActionVerb[] {
  const registry = getActionRegistry();
  const verbs: ServerActionVerb[] = [];

  for (const action of registry.values()) {
    const pv = action.config.paletteVerb;
    if (!pv) continue;
    verbs.push({
      name: action.config.name,
      description: action.config.description,
      label: pv.label,
      hint: pv.hint ?? null,
      group: pv.group,
      iconName: pv.iconName,
      contextual: pv.contextual ?? false,
      requiresApproval: action.config.requiresApproval ?? false,
    });
  }

  verbs.sort((a, b) => {
    const g = groupRank(a.group) - groupRank(b.group);
    if (g !== 0) return g;
    return a.label.localeCompare(b.label);
  });

  return verbs;
}

function groupRank(group: ServerActionVerb["group"]): number {
  switch (group) {
    case "navigate":
      return 0;
    case "item":
      return 1;
    case "create":
      return 2;
    case "ai":
      return 3;
    case "settings":
      return 4;
    default:
      return 99;
  }
}
