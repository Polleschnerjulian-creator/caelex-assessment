/**
 * Audit-anchor service — Sprint 8A (Phase 4: USP + Polish)
 *
 * Anchors Caelex's per-organization audit-log hash chain to Bitcoin
 * via OpenTimestamps' free public calendar servers. Result: any
 * regulator, investor, or third-party can verify "this audit row
 * existed at this Bitcoin block height" without trusting Caelex.
 *
 * # Wire protocol — OpenTimestamps /digest
 *
 * https://github.com/opentimestamps/opentimestamps-server/blob/master/doc/api.md
 *
 *   POST <calendar-url>/digest
 *     Content-Type: application/octet-stream
 *     Body: 32-byte SHA-256 digest (raw binary, NOT hex)
 *   →
 *     200 + ots-proof bytes (binary; ~140 bytes initially, grows on
 *     upgrade once Bitcoin confirms)
 *
 * The proof returned is PENDING — it includes the calendar's
 * commitment to the digest but Bitcoin hasn't yet mined a block
 * containing the calendar's roll-up. Sprint 8B's upgrade-cron
 * re-fetches the proof ~6h later to get the confirmed Merkle path
 * to a Bitcoin block header.
 *
 * # Calendar redundancy
 *
 * We anchor against multiple calendars in parallel. If one server
 * disappears tomorrow, the others still hold the proof. Default
 * calendars match the OpenTimestamps client default list — battle-
 * tested public infrastructure that's been running since 2016.
 *
 * # Why we anchor per-org (not globally)
 *
 * Each org's audit chain is independent (Sprint 1A FIX A-1: chains
 * are scoped per organizationId). Anchoring per-org gives every org
 * its own verifiable proof history. Cost: N anchors per cron tick
 * for N active orgs. At early-stage Caelex scale (<50 orgs) this is
 * fine; we'll add budget caps later if needed.
 */

import "server-only";

import { createHash } from "crypto";

import { prisma } from "./prisma";
import { getLatestHash } from "./audit-hash.server";
import { logger } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditTimestampAnchor = (prisma as any).auditTimestampAnchor;

/**
 * Default OpenTimestamps public calendar servers. Same set as the
 * official `opentimestamps-client` defaults.
 */
export const DEFAULT_OTS_CALENDARS: readonly string[] = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];

export interface SubmitAuditAnchorOptions {
  /** Calendar URLs to anchor against. Defaults to DEFAULT_OTS_CALENDARS. */
  calendars?: readonly string[];
  /**
   * Override fetch — used by tests to mock the calendar response.
   * Production code should leave this undefined.
   */
  fetchImpl?: typeof fetch;
  /** Per-call AbortSignal so tests / orchestrators can cut over. */
  signal?: AbortSignal;
}

export interface AnchorResult {
  organizationId: string;
  /** One row per successfully-anchored calendar — N calendars, up to
   *  N rows. Failed-calendar rows are written too (status FAILED). */
  anchors: Array<{
    id: string;
    calendarUrl: string;
    status: "PENDING" | "FAILED";
    proofBytes?: number;
    error?: string;
  }>;
}

/**
 * Anchor an organization's audit chain head against OpenTimestamps.
 * Returns one anchor row per calendar attempted (success + failure).
 *
 * Calendars are submitted in parallel; the slowest one bounds the
 * total wall-clock time. Each calendar that succeeds creates an
 * AuditTimestampAnchor row in PENDING status. Failed calendars get
 * a FAILED row with the error message — the cron operator sees them
 * in the response payload.
 */
export async function submitAuditAnchor(
  organizationId: string,
  opts: SubmitAuditAnchorOptions = {},
): Promise<AnchorResult> {
  const calendars = opts.calendars ?? DEFAULT_OTS_CALENDARS;
  const fetchImpl = opts.fetchImpl ?? fetch;

  // 1. Compute the chain head digest — SHA-256 of the latest entry
  //    hash hex string. We hash the hex (not raw bytes) so the proof
  //    binds to "the entry as serialized in our DB" rather than to
  //    the entry's payload itself; Sprint 8C verify can recompute
  //    the same digest from the AuditLog row.
  const headHash = await getLatestHash(organizationId);
  const digest = createHash("sha256").update(headHash, "utf8").digest();
  const anchorHash = digest.toString("hex");

  // 2. Fan out to each calendar in parallel.
  const settled = await Promise.allSettled(
    calendars.map(async (calendarUrl) => {
      const url = `${calendarUrl.replace(/\/+$/, "")}/digest`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: digest,
        signal: opts.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const proofArrayBuffer = await res.arrayBuffer();
      const proofBuffer = Buffer.from(proofArrayBuffer);
      if (proofBuffer.length === 0) {
        throw new Error("calendar returned empty proof");
      }
      return { calendarUrl, proofBuffer };
    }),
  );

  // 3. Persist results. PENDING rows for successes, FAILED rows for
  //    the rest. Both kinds let the operator see the cron's full
  //    behaviour in the DB.
  const anchors: AnchorResult["anchors"] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const calendarUrl = calendars[i];
    if (result.status === "fulfilled") {
      const { proofBuffer } = result.value;
      try {
        const row = await auditTimestampAnchor.create({
          data: {
            organizationId,
            anchorHash,
            otsProof: proofBuffer,
            calendarUrl,
            status: "PENDING",
          },
          select: { id: true },
        });
        anchors.push({
          id: row.id,
          calendarUrl,
          status: "PENDING",
          proofBytes: proofBuffer.length,
        });
      } catch (err) {
        logger.error("[audit-anchor] DB write failed", {
          organizationId,
          calendarUrl,
          error: (err as Error).message ?? String(err),
        });
        anchors.push({
          id: "",
          calendarUrl,
          status: "FAILED",
          error: `DB write failed: ${(err as Error).message ?? String(err)}`,
        });
      }
    } else {
      const errMsg = (result.reason as Error)?.message ?? String(result.reason);
      // Persist a FAILED row so the operator sees calendar outages
      // in the same place as successes.
      try {
        const row = await auditTimestampAnchor.create({
          data: {
            organizationId,
            anchorHash,
            otsProof: Buffer.alloc(0),
            calendarUrl,
            status: "FAILED",
            errorMessage: errMsg,
          },
          select: { id: true },
        });
        anchors.push({
          id: row.id,
          calendarUrl,
          status: "FAILED",
          error: errMsg,
        });
      } catch {
        // Couldn't even write the failure row — surface in the result
        anchors.push({
          id: "",
          calendarUrl,
          status: "FAILED",
          error: errMsg,
        });
      }
    }
  }

  return { organizationId, anchors };
}

/**
 * Anchor every active organization's audit chain head. Returns the
 * per-org result list — used by the quarterly cron.
 *
 * "Active" = has at least one AuditLog entry. Empty orgs don't
 * generate an anchor (no chain head to anchor).
 */
export async function submitAuditAnchorsForAllActiveOrgs(
  opts: SubmitAuditAnchorOptions = {},
): Promise<AnchorResult[]> {
  // Distinct org ids that have at least one audit log row. Cap at
  // 500 — if Caelex grows past that, we add pagination + multi-tick
  // budgeting. At early-stage scale this is plenty.
  const orgs = (await prisma.auditLog.findMany({
    where: { organizationId: { not: null } },
    distinct: ["organizationId"],
    select: { organizationId: true },
    take: 500,
  })) as Array<{ organizationId: string | null }>;

  const results: AnchorResult[] = [];
  for (const o of orgs) {
    if (!o.organizationId) continue;
    const r = await submitAuditAnchor(o.organizationId, opts);
    results.push(r);
  }
  return results;
}
