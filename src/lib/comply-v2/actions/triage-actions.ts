import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { defineAction } from "./define-action";
import {
  acknowledgeTriageItemAtSource,
  dismissTriageItemAtSource,
} from "../triage-service.server";

/**
 * Phase 2 actions on TriageItems (the cross-source signal queue).
 *
 *   - acknowledge-triage-item — mark seen, may still need follow-up
 *   - dismiss-triage-item     — decide it's not actionable, hide it
 *
 * Both actions delegate to triage-service.server which handles the
 * source-specific dispositions (Notification.dismissed,
 * RegulatoryUpdateRead row, SatelliteAlert.resolvedAt).
 *
 * Neither requires approval — these are personal-inbox actions, not
 * compliance-state changes. They're safe enough that Astra can call
 * them autonomously without queuing a proposal.
 */

export const acknowledgeTriageItem = defineAction({
  name: "acknowledge-triage-item",
  description:
    "Mark a triage item as seen. The item disappears from the active triage queue but its underlying signal is preserved (e.g. a notification stays in the user's inbox archive).",
  schema: z.object({
    itemId: z.string().min(3),
  }),
  async handler({ itemId }, ctx) {
    await acknowledgeTriageItemAtSource(itemId, ctx.userId);
    revalidatePath("/dashboard/triage");
    return { itemId, action: "ACKNOWLEDGED" };
  },
  paletteVerb: {
    label: "Acknowledge triage item",
    hint: "Mark the selected signal as seen",
    group: "item",
    iconName: "Check",
    contextual: true,
  },
  astra: {
    enabled: true,
    description:
      "Mark a triage item as acknowledged. The item is hidden from the active queue but the source signal is preserved.",
  },
});

export const dismissTriageItem = defineAction({
  name: "dismiss-triage-item",
  description:
    "Dismiss a triage item — strongest disposition, signals the user has decided this isn't actionable. Per-source semantics: notifications get dismissed, satellite alerts get resolved, regulatory updates get read-marked.",
  schema: z.object({
    itemId: z.string().min(3),
  }),
  async handler({ itemId }, ctx) {
    await dismissTriageItemAtSource(itemId, ctx.userId);
    revalidatePath("/dashboard/triage");
    return { itemId, action: "DISMISSED" };
  },
  paletteVerb: {
    label: "Dismiss triage item",
    hint: "Hide the selected signal — not actionable",
    group: "item",
    iconName: "X",
    contextual: true,
  },
  astra: {
    enabled: true,
    description:
      "Dismiss a triage item as not actionable. Marks the underlying signal resolved across its native surface.",
  },
});

export const TRIAGE_ACTIONS = {
  acknowledgeTriageItem,
  dismissTriageItem,
} as const;
