/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Meeting → CRM importer — server orchestration (Stage 1).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Two steps, both driven by the route:
 *   buildPreview(transcript)        — extract (Claude) → email-match → preview.
 *                                     NOTHING is written. The user reviews/edits.
 *   commitImport(payload, authorId) — write the reviewed payload: upsert contacts
 *                                     (reuse `auto-link`), one MEETING_HELD
 *                                     activity (full transcript as the body), a
 *                                     note per contact, optional tasks + deal.
 *
 * Reuses the CRM's solved primitives: `upsertContact`/`upsertCompany` (email/
 * domain dedupe) and `extractMeetingContacts` (the validated LLM call). The LLM
 * output is already Zod-bounded by `extractMeetingContacts`; `commitImport`
 * re-validates the (client-supplied) commit payload server-side as defence in
 * depth — the client is never the gate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { extractMeetingContacts } from "./ai.server";
import { upsertCompany, upsertContact } from "./auto-link.server";
import {
  commitPayloadSchema,
  type ImportPreview,
  type PreviewContact,
  type CommitPayload,
  type CommitResult,
} from "./meeting-import-types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** A lowercased, trimmed email when it looks valid + in-bounds, else null. */
function cleanEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/** Split a display name into first/last on the last space (matches auto-link). */
function splitName(name: string): { firstName?: string; lastName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/** The CrmNote body = summary + bulleted action items. */
function buildNoteBody(summary: string, actionItems: string[]): string {
  if (!actionItems.length) return summary;
  const bullets = actionItems.map((a) => `- ${a}`).join("\n");
  return `${summary}\n\nAction items:\n${bullets}`;
}

/** A guarded Date from an optional ISO string; falls back to now() on invalid. */
function parseOccurredAt(meetingDate: string | null | undefined): Date {
  if (meetingDate) {
    const d = new Date(meetingDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Extract + email-match a transcript into an editable preview. No DB writes.
 * Matching is by EMAIL ONLY (the unique key) — no fuzzy name auto-merge, which
 * could wrongly fuse two different people. Unmatched / no-email attendees are
 * proposed as new contacts; the user can manually link in the UI.
 */
export async function buildPreview(transcript: string): Promise<ImportPreview> {
  const extraction = await extractMeetingContacts(transcript);

  const contacts: PreviewContact[] = [];
  for (const a of extraction.attendees) {
    const email = cleanEmail(a.email);
    let matchedContactId: string | null = null;
    if (email) {
      const existing = await prisma.crmContact.findUnique({
        where: { email },
        select: { id: true },
      });
      matchedContactId = existing?.id ?? null;
    }
    contacts.push({
      name: a.name,
      email,
      company: a.company ?? null,
      title: a.title ?? null,
      matchedContactId,
    });
  }

  return {
    meetingTitle: extraction.meetingTitle ?? null,
    meetingDate: extraction.meetingDate ?? null,
    summary: extraction.summary,
    noteBody: buildNoteBody(extraction.summary, extraction.actionItems),
    contacts,
    actionItems: extraction.actionItems,
  };
}

/**
 * Commit the (possibly user-edited) preview. Re-validates the payload, then:
 * upsert each contact (reuse auto-link; no-email contacts created directly),
 * one MEETING_HELD activity carrying the full transcript, a note per contact,
 * a task per checked action item, and an optional deal (only when the primary
 * contact has a company — `CrmDeal.companyId` is required).
 */
export async function commitImport(
  payload: CommitPayload,
  authorId: string,
): Promise<CommitResult> {
  // Defence in depth — never trust the client body even though the route parsed it.
  const data = commitPayloadSchema.parse(payload);
  const occurredAt = parseOccurredAt(data.meetingDate);

  // 1. Contacts. upsertContact keys on email; a no-email attendee is created
  //    directly (email is nullable + @unique allows multiple nulls).
  const contactIds: string[] = [];
  for (const c of data.contacts) {
    const { firstName, lastName } = splitName(c.name);
    let companyId: string | undefined;
    if (c.company) {
      const company = await upsertCompany({ name: c.company });
      companyId = company?.id ?? undefined;
    }

    let contactId: string | null = null;
    if (c.email) {
      const contact = await upsertContact({
        email: c.email,
        firstName,
        lastName,
        title: c.title ?? undefined,
        companyId,
      });
      contactId = contact?.id ?? null;
    } else {
      const contact = await prisma.crmContact.create({
        data: { firstName, lastName, title: c.title ?? undefined, companyId },
      });
      contactId = contact.id;
    }

    if (contactId) {
      contactIds.push(contactId);
      await prisma.crmContact.update({
        where: { id: contactId },
        data: { lastTouchAt: occurredAt },
      });
    }
  }

  const primaryId = contactIds[0] ?? null;

  // 2. One meeting activity — the full transcript is the durable record.
  const activity = await prisma.crmActivity.create({
    data: {
      type: "MEETING_HELD",
      source: "MANUAL",
      summary: (data.meetingTitle || "Meeting").slice(0, 200),
      body: data.transcript,
      occurredAt,
      contactId: primaryId,
      userId: authorId,
      metadata: {
        attendees: data.contacts.map((c) => ({
          name: c.name,
          email: c.email,
          company: c.company,
          title: c.title,
        })),
        actionItems: data.actionItemsAsTasks,
      },
    },
  });

  // 3. A note on each contact.
  let notesCreated = 0;
  for (const id of contactIds) {
    await prisma.crmNote.create({
      data: { body: data.noteBody, authorId, contactId: id },
    });
    notesCreated++;
  }

  // 4. Tasks from the checked action items (linked to the primary contact).
  let tasksCreated = 0;
  for (const title of data.actionItemsAsTasks) {
    await prisma.crmTask.create({
      data: {
        title: title.slice(0, 500),
        ownerId: authorId,
        contactId: primaryId,
      },
    });
    tasksCreated++;
  }

  // 5. Optional deal — a CrmDeal requires a company, so only when the primary
  //    contact resolved to one.
  let dealCreated = false;
  if (data.createDeal && primaryId) {
    const primary = await prisma.crmContact.findUnique({
      where: { id: primaryId },
      select: { companyId: true },
    });
    if (primary?.companyId) {
      await prisma.crmDeal.create({
        data: {
          title: (data.meetingTitle || "New deal").slice(0, 200),
          companyId: primary.companyId,
          primaryContactId: primaryId,
          ownerId: authorId,
          // stage defaults to IDENTIFIED (the first pipeline stage).
        },
      });
      dealCreated = true;
    } else {
      logger.info(
        "Meeting import: deal skipped — primary contact has no company",
      );
    }
  }

  return {
    contactsUpserted: contactIds.length,
    notesCreated,
    tasksCreated,
    dealCreated,
    activityId: activity.id,
  };
}
