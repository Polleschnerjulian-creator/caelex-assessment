# Meeting → CRM Importer (Stage 1) — Design

**Date:** 2026-06-08
**Status:** Approved (verbal) — Konzept-vor-Code record for the build.
**Context:** Piece 2 of the admin expansion. The CRM already exists
(`/dashboard/admin/crm`: contacts/companies/deals/notes/activities/tasks,
lead-scoring, AI research, `auto-link` from demos) but is **empty**. The user
wants meeting transcripts (Google Meet + Gemini) to flow into it. We build the
**importer first** (staged approach), then the automated Google poll later.

## Goal

In one paste, turn a Gemini meeting transcript/notes into clean CRM data:
matched/created **contacts** + a **meeting note** + a **meeting activity**
(+ optional **tasks** from action items, + optional **deal**), behind a
human **preview → confirm** so the LLM can never write junk unreviewed.

## Non-goals (this stage)

- No Google OAuth / Drive / Gmail integration (that is **Stage 2**, deferred).
- No new Prisma models (everything reuses existing CRM models).
- No changes to the new light `/admin` surface (surfacing the CRM there is a
  separate later piece — the user chose _automation first_).

## Flow

1. **Paste** — In `/dashboard/admin/crm`, an "Import meeting" panel with a
   textarea for the Gemini notes/transcript (+ optional meeting title/date).
2. **Extract** — one Claude call (reusing the existing EU-routed Anthropic
   client in `lib/crm/ai.server.ts`, ~1 call/meeting = the moderate token cost
   approved; **zero** external/Google cost) returns **strict JSON**:
   ```ts
   {
     meetingTitle?: string,
     meetingDate?: string,            // ISO date if stated in the transcript
     summary: string,                 // 2–4 sentence neutral summary
     attendees: Array<{
       name: string,
       email?: string,                // only if explicitly present
       company?: string,
       title?: string,
     }>,
     actionItems: string[],           // imperative, one per item
   }
   ```
   Internal-only / Caelex-side attendees are excluded by the prompt (we only
   want external prospect/customer contacts).
3. **Preview** — server matches each attendee against existing `CrmContact`
   **by email only** (via `auto-link`). No email, or no match → proposed as a
   **new** contact (NO fuzzy name auto-merge — that risks merging two different
   people; the user can manually link to an existing contact in the preview if
   they recognise one). Returns an editable preview:
   per attendee → `{ matchedContactId?, willCreate, name, email, company,
title }`; the note body; the action items (each a checkbox → task); and a
   single "create deal" checkbox (default OFF). **Nothing is written yet.**
4. **Confirm** — the (possibly user-edited) preview is posted back and
   committed in one transaction:
   - `upsertCompany` + `upsertContact` (reuse `auto-link`) per attendee, with
     `sourceTags += "meeting"` and `lastTouchAt = meetingDate`.
   - one **`CrmActivity`** (`type: MEETING_HELD`, `source: SYSTEM`, `summary`,
     `body` = full pasted transcript, `occurredAt` = meetingDate,
     `metadata` = { attendees, actionItems }) linked to the primary contact.
   - one **`CrmNote`** (`body` = summary + action items, `authorId` = importer)
     per matched/created contact.
   - optional **`CrmTask`** per checked action item (`ownerId` = importer,
     `contactId` = primary).
   - optional **`CrmDeal`** if the checkbox is on (stage = first pipeline stage,
     `primaryContact` = first attendee).

## Resolved options

- **Action items → Tasks:** YES — created from checked items in the preview.
- **Deal:** a **preview checkbox** (default OFF), not forced auto-create — keeps
  the pipeline clean while allowing one-click deal creation.

## Files (new, ~5 — all reuse existing infra)

| File                                                  | Responsibility                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/crm/ai.server.ts` (extend)                   | add `extractMeetingContacts(transcript)` — strict-JSON Claude call, mirrors `researchCompany` (same client, model, `extractText`, JSON-parse, graceful fallback).                                       |
| `src/lib/crm/meeting-import.server.ts` (new)          | orchestration: `buildPreview(transcript)` (extract → match) + `commitImport(reviewedPayload, authorId)` (upserts + note/activity/tasks/deal in a `$transaction`). Pure-ish; reuses `auto-link` upserts. |
| `src/app/api/admin/crm/import-meeting/route.ts` (new) | `POST` with `{ mode: "preview" \| "commit", … }`. Admin-gated **exactly like the sibling** `/api/admin/crm/*` routes (same auth/role check). Rate-limited (the LLM call).                               |
| `src/components/crm/MeetingImport.tsx` (new)          | the paste → Extract → editable preview → Confirm panel (matches the existing CRM component styling).                                                                                                    |
| `src/app/dashboard/admin/crm/page.tsx` (wire)         | an "Import meeting" button that opens the panel/modal.                                                                                                                                                  |

## Reuse (do not reinvent)

- `lib/crm/auto-link.server.ts` → `upsertCompany`, `upsertContact` (email/domain
  dedupe — the matching is already solved).
- `lib/crm/ai.server.ts` → the Anthropic client + the strict-JSON extraction
  pattern (`researchCompany` is the template).
- Existing `/api/admin/crm/*` route → the auth/role gate to copy.

## Security & cost

- The import route uses the **same admin gate** as the other `/api/admin/crm/*`
  routes (no new privilege surface). Input transcript is treated as untrusted
  text fed to the LLM; the extracted JSON is **schema-validated (Zod)** before
  any DB write, and emails/names are length-bounded.
- Cost: **one** Claude call per import, EU-routed via the existing AI Gateway →
  Bedrock. No Google APIs, no inbound-email infra, no new external service.

## Testing

- Pure: `extractMeetingContacts` JSON parsing (valid / fenced / malformed →
  graceful), the preview matching (email match vs new), the commit payload
  shaping. (DB-free where possible; mocked Prisma for the route.)
- Route: admin gate (403 when not admin), preview vs commit branches.

## Stage 2 (deferred — not built now)

A nightly cron + one-time Google OAuth (Drive/Gmail read scope) discovers new
Gemini meeting transcripts → the **same** `buildPreview`/`commitImport`
pipeline → auto-commit high-confidence imports, queue low-confidence for review.
