/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Meeting → CRM importer — shared wire types + Zod validation (Stage 1).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The SINGLE contract surface both the client panel (`MeetingImport.tsx`) and the
 * server (`meeting-import.server.ts`, the `/api/admin/crm/import-meeting` route)
 * compile against. PURE module — no `server-only`, no Prisma — so the client can
 * import the types; Zod is browser-safe so the schemas live here too.
 *
 * SECURITY: the meeting transcript is untrusted user input fed to an LLM, and the
 * LLM's JSON output is likewise untrusted. EVERY string here is length-bounded and
 * arrays are capped, so neither the extraction nor a tampered commit payload can
 * smuggle an unbounded blob (or a malformed email) into the CRM. The server
 * re-validates the commit payload with these schemas before any DB write — the
 * client validation is a convenience, never the gate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";

const bounded = (max: number) => z.string().max(max);
/** A nullable email that also accepts "" (coerced to null) — the user may clear it. */
const nullableEmail = z
  .union([z.string().max(254).email(), z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : v));

// ─────────────────────────────────────────────────────────────────────────────
// 1. The LLM extraction (Claude → strict JSON). Validated before it is trusted.
// ─────────────────────────────────────────────────────────────────────────────

export const meetingAttendeeSchema = z.object({
  name: bounded(200),
  // Lenient at EXTRACTION (the LLM may return a slightly-off string); a single
  // malformed email must not fail the whole array. `buildPreview` validates the
  // format and turns a non-email into null before it reaches the strict
  // preview/commit schemas below.
  email: bounded(254).optional(),
  company: bounded(200).optional(),
  title: bounded(200).optional(),
});
export type MeetingAttendee = z.infer<typeof meetingAttendeeSchema>;

export const meetingExtractionSchema = z.object({
  meetingTitle: bounded(300).optional(),
  /** ISO date string if one is stated in the transcript; never trusted as a Date. */
  meetingDate: bounded(40).optional(),
  summary: bounded(8000).default(""),
  attendees: z.array(meetingAttendeeSchema).max(100).default([]),
  actionItems: z.array(bounded(1000)).max(100).default([]),
});
export type MeetingExtraction = z.infer<typeof meetingExtractionSchema>;

/** The safe, empty extraction used whenever the LLM is unavailable or returns junk. */
export const EMPTY_EXTRACTION: MeetingExtraction = {
  summary: "",
  attendees: [],
  actionItems: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. The preview (server → client): email-matched, editable, NOTHING written yet.
// ─────────────────────────────────────────────────────────────────────────────

export const previewContactSchema = z.object({
  name: bounded(200),
  email: nullableEmail,
  company: bounded(200).nullable(),
  title: bounded(200).nullable(),
  /** set when an existing CrmContact matched by email; null = will be created. */
  matchedContactId: bounded(64).nullable(),
});
export type PreviewContact = z.infer<typeof previewContactSchema>;

export interface ImportPreview {
  meetingTitle: string | null;
  meetingDate: string | null;
  summary: string;
  /** summary + bulleted action items — the CrmNote body. */
  noteBody: string;
  contacts: PreviewContact[];
  actionItems: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. The commit (client → server): the possibly-edited preview, re-validated.
// ─────────────────────────────────────────────────────────────────────────────

export const commitPayloadSchema = z.object({
  /** full pasted transcript → stored as the CrmActivity body. */
  transcript: bounded(200000),
  meetingTitle: bounded(300).nullable().optional(),
  meetingDate: bounded(40).nullable().optional(),
  summary: bounded(8000),
  noteBody: bounded(20000),
  contacts: z.array(previewContactSchema).max(100),
  /** checked action items → CrmTasks. */
  actionItemsAsTasks: z.array(bounded(1000)).max(100),
  createDeal: z.boolean(),
});
export type CommitPayload = z.infer<typeof commitPayloadSchema>;

export interface CommitResult {
  contactsUpserted: number;
  notesCreated: number;
  tasksCreated: number;
  dealCreated: boolean;
  activityId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. The POST body for /api/admin/crm/import-meeting (preview | commit).
// ─────────────────────────────────────────────────────────────────────────────

export const importMeetingBodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview"), transcript: bounded(200000).min(1) }),
  z.object({ mode: z.literal("commit"), payload: commitPayloadSchema }),
]);
export type ImportMeetingBody = z.infer<typeof importMeetingBodySchema>;
