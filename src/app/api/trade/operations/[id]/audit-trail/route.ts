/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Passage P2, Lane C — the tamper-evident AUDIT-TRAIL endpoints for a
 * single Ausfuhrvorgang.
 *
 *   GET  /api/trade/operations/[id]/audit-trail
 *        Returns THIS operation's AuditLog entries (org-scoped, entityType
 *        "trade_operation", entityId = id) as a chain — each entry's entryHash
 *        + previousHash so the UI can render the SHA-256 links. READ-ONLY.
 *
 *   POST /api/trade/operations/[id]/audit-trail
 *        Runs the EXISTING hash-chain verify (verifyChain in
 *        audit-hash.server.ts) over the org's chain and reports whether it is
 *        intact or BROKEN at entry N. The result is wrapped server-side into
 *        the canonical Explanation Envelope (WHAT/WHY/WHEREFORE/CONFIDENCE/
 *        SOURCE/OVERRIDE) so the renderer surfaces it through <ExplainedPanel>.
 *        The ONLY write this performs is the audit-log OF THE VERIFICATION
 *        ITSELF ("hash_chain_verified") — it never mutates a verdict, never
 *        clears anything, and never weakens a determination.
 *
 * Auth + org-scoping mirror the sibling .../dossier + .../assess routes:
 * getTradeAuth gates session + org membership + TRADE entitlement (with
 * super-admin god-mode); the operation is resolved ONLY within the caller's
 * organizationId; the call is rate-limited.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { verifyChain } from "@/lib/audit-hash.server";
import {
  explainedResult,
  unverifiedResult,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";

export const runtime = "nodejs";

// The verification result envelope value — the machine-readable summary the
// UI keys off, alongside the human-facing WHAT/WHY/WHEREFORE.
interface ChainVerification {
  valid: boolean;
  checkedEntries: number;
  brokenAtEntryId?: string;
  brokenAtTimestamp?: string;
}

// ─── GET — list this operation's chain entries ──────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // Defence in depth: confirm the operation is in the caller's org BEFORE
    // returning any audit rows for it.
    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
      select: { id: true, reference: true, status: true, closedAt: true },
    });
    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pull every AuditLog row for THIS operation, oldest-first so the chain
    // reads top-to-bottom (matching how the hashes link forward). Org-scoped
    // again — a hand-crafted entityId from another org can never surface here.
    const entries = await prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: "trade_operation",
        entityId: id,
      },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      select: {
        id: true,
        action: true,
        description: true,
        timestamp: true,
        entryHash: true,
        previousHash: true,
        user: { select: { name: true, email: true } },
      },
      take: 500,
    });

    return NextResponse.json({
      operation: {
        id: operation.id,
        reference: operation.reference,
        status: operation.status,
        closedAt: operation.closedAt ? operation.closedAt.toISOString() : null,
      },
      entries: entries.map((e) => ({
        id: e.id,
        action: e.action,
        description: e.description,
        timestamp: e.timestamp.toISOString(),
        entryHash: e.entryHash,
        previousHash: e.previousHash,
        actor: e.user?.name ?? e.user?.email ?? null,
      })),
    });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/audit-trail failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST — verify the chain (the "Kette verifizieren" action) ──────────────

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    // Verification is a sensitive, write-producing forensic action — use the
    // stricter "sensitive" tier (5/hr) rather than the generic api tier.
    const rl = await checkRateLimit("sensitive", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
      select: { id: true, reference: true },
    });
    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Run the EXISTING tamper-evident chain verifier over the org's chain.
    // verifyChain recomputes every entry's SHA-256 and checks the
    // previousHash linkage — a single altered/deleted row breaks it.
    const result = await verifyChain(organizationId);

    const verification: ChainVerification = {
      valid: result.valid,
      checkedEntries: result.checkedEntries,
      brokenAtEntryId: result.brokenAt?.entryId,
      brokenAtTimestamp: result.brokenAt?.timestamp.toISOString(),
    };

    // Wrap the result in the canonical Explanation Envelope. A BROKEN chain
    // fails CLOSED to UNVERIFIED — it is a loud, blocking finding, never a
    // silent green. An intact chain is a determined, HIGH-confidence result
    // sourced to the SHA-256 hash-chain mechanism itself.
    const explained: ExplainedResult<ChainVerification> = result.valid
      ? explainedResult({
          value: verification,
          what: `Audit-Kette intakt — ${result.checkedEntries} Einträge verifiziert.`,
          why:
            `Jeder AuditLog-Eintrag wurde per SHA-256 über seinen Inhalt + den ` +
            `Hash des Vorgängers neu berechnet; alle previousHash-Verknüpfungen ` +
            `stimmen mit der gespeicherten Kette überein. Eine nachträgliche ` +
            `Änderung oder Löschung eines Eintrags würde die Kette ab diesem ` +
            `Punkt brechen — das ist hier nicht der Fall.`,
          wherefore:
            `Die Aufzeichnungen zu diesem Vorgang sind manipulationsgeschützt ` +
            `und können als Nachweis-of-record gegenüber Zoll / BAFA / BIS ` +
            `vorgelegt werden. Keine Aktion erforderlich.`,
          confidence: "HIGH",
          sources: [
            {
              label: "Caelex AuditLog — SHA-256 Hash-Kette",
              citation:
                "Tamper-evident hash chain (audit-hash.server.ts · verifyChain)",
              listVersion: `geprüft ${new Date().toISOString()}`,
            },
          ],
        })
      : unverifiedResult({
          value: verification,
          what: result.brokenAt
            ? `Audit-Kette GEBROCHEN bei Eintrag ${result.brokenAt.entryId} — Manipulation möglich.`
            : `Audit-Kette konnte nicht verifiziert werden.`,
          why: result.brokenAt
            ? `Die SHA-256-Verknüpfung bricht bei Eintrag ${result.brokenAt.entryId} ` +
              `(${result.brokenAt.timestamp.toISOString()}): erwartet ` +
              `"${result.brokenAt.expected.slice(0, 24)}…", gefunden ` +
              `"${result.brokenAt.actual.slice(0, 24)}…". Ein Eintrag wurde ` +
              `nachträglich verändert oder gelöscht, oder eine Hash-Berechnung ` +
              `ist zuvor fehlgeschlagen. Die Integrität ab diesem Punkt ist NICHT ` +
              `mehr gewährleistet.`
            : `Der Verifizierungslauf konnte die Kette nicht vollständig prüfen. ` +
              `Solange das nicht aufgeklärt ist, gilt die Integrität als ` +
              `unbestätigt — das ist keine Freigabe.`,
          wherefore:
            `Diese Aufzeichnung NICHT als unveränderten Nachweis vorlegen. Den ` +
            `Bruch der Exportkontroll-Verantwortung / dem Sicherheits-Team ` +
            `melden und die Ursache klären, bevor der Audit-Trail weiterverwendet ` +
            `wird.`,
          sources: [
            {
              label: "Caelex AuditLog — SHA-256 Hash-Kette",
              citation:
                "Tamper-evident hash chain (audit-hash.server.ts · verifyChain)",
              listVersion: `geprüft ${new Date().toISOString()}`,
            },
          ],
        });

    // The ONLY write: record THAT the verification ran (who, when, outcome).
    // This itself extends the hash chain — verifying is an auditable act.
    const { ipAddress, userAgent } = getRequestContext(req);
    await logAuditEvent({
      userId,
      organizationId,
      action: "hash_chain_verified",
      entityType: "trade_operation",
      entityId: id,
      description: `Audit-Kette für Vorgang ${operation.reference} verifiziert: ${
        result.valid
          ? `intakt (${result.checkedEntries} Einträge)`
          : `GEBROCHEN${result.brokenAt ? ` bei ${result.brokenAt.entryId}` : ""}`
      }`,
      metadata: {
        valid: result.valid,
        checkedEntries: result.checkedEntries,
        brokenAtEntryId: result.brokenAt?.entryId ?? null,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ explained });
  } catch (err) {
    logger.error("POST /api/trade/operations/[id]/audit-trail failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
