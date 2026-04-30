"use server";

import {
  acknowledgeTriageItem,
  dismissTriageItem,
} from "@/lib/comply-v2/actions/triage-actions";

/**
 * Form-action wrappers for the Triage page. Same pattern as
 * src/app/dashboard/today/server-actions.ts — defineAction() does
 * the validation, auth, source-specific dispositions and revalidate.
 */

export async function acknowledgeAction(formData: FormData): Promise<void> {
  const result = await acknowledgeTriageItem.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] acknowledge failed:", result.error);
  }
}

export async function dismissAction(formData: FormData): Promise<void> {
  const result = await dismissTriageItem.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] dismiss failed:", result.error);
  }
}
