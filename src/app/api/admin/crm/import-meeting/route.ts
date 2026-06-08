/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * POST /api/admin/crm/import-meeting — Meeting → CRM importer (Stage 1).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Admin-only, two modes (discriminated body):
 *   { mode: "preview", transcript }  → extract + email-match → ImportPreview
 *                                      (NOTHING written; the LLM call lives here).
 *   { mode: "commit",  payload }     → write the reviewed payload → CommitResult.
 *
 * Gate mirrors the sibling /api/admin/crm/* routes exactly: a session is required
 * (401) and `requireRole(["admin"])` (403). Body is Zod-validated before any LLM
 * call or DB write — the LLM output + the commit payload are both re-bounded by
 * the shared schemas (see meeting-import-types), so untrusted transcript text can
 * never reach the CRM as anything but typed, length-capped fields.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { importMeetingBodySchema } from "@/lib/crm/meeting-import-types";
import { buildPreview, commitImport } from "@/lib/crm/meeting-import.server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Throws ForbiddenError for a non-admin → mapped to 403 below.
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = importMeetingBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.mode === "preview") {
      const preview = await buildPreview(parsed.data.transcript);
      return NextResponse.json(preview);
    }

    const result = await commitImport(parsed.data.payload, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    // Map the DAL's typed auth errors to the right status without leaking detail.
    const name = err instanceof Error ? err.name : "";
    if (name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (name === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("Meeting import failed", { error: err });
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Meeting import failed") },
      { status: 500 },
    );
  }
}
