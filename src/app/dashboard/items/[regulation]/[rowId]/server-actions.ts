"use server";

import {
  snoozeComplianceItem,
  unsnoozeComplianceItem,
  addComplianceItemNote,
  markAsAttested,
  requestEvidence,
} from "@/lib/comply-v2/actions/compliance-item-actions";

/**
 * Server-action wrappers for the Per-Item detail page. Same pattern
 * as src/app/dashboard/today/server-actions.ts: void return so
 * `<form action={...}>` accepts them; revalidatePath happens inside
 * each defineAction()-handler.
 *
 * The detail page passes `_redirect` via hidden input — we don't act
 * on it server-side here (Next.js form actions stay on the page),
 * but defineAction's reserved-fields parser ignores it anyway.
 */

export async function snoozeAction(formData: FormData): Promise<void> {
  const result = await snoozeComplianceItem.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] snooze failed:", result.error);
  }
}

export async function unsnoozeAction(formData: FormData): Promise<void> {
  const result = await unsnoozeComplianceItem.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] unsnooze failed:", result.error);
  }
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const result = await addComplianceItemNote.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] add-note failed:", result.error);
  }
}

export async function markAttestedAction(formData: FormData): Promise<void> {
  const result = await markAsAttested.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] mark-attested failed:", result.error);
  }
}

export async function requestEvidenceAction(formData: FormData): Promise<void> {
  const result = await requestEvidence.serverAction(formData);
  if (!result.ok) {
    console.warn("[comply-v2] request-evidence failed:", result.error);
  }
}
