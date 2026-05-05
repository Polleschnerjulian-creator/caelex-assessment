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

/**
 * Lazily-resolve the auditTimestampAnchor delegate so test mocks
 * that vi.mock("./prisma") AFTER this module loads still see their
 * stubs. Prisma's generated types lag the schema until db:generate
 * runs, so we reach through `as any` for the writable surface.
 */
function getAnchorDelegate(): {
  create: (args: unknown) => Promise<{ id: string }>;
  findUnique: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).auditTimestampAnchor;
}

const auditTimestampAnchor = new Proxy(
  {} as ReturnType<typeof getAnchorDelegate>,
  {
    get(_target, prop) {
      return (getAnchorDelegate() as Record<string | symbol, unknown>)[prop];
    },
  },
);

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
  // T5-9 (audit fix 2026-05-05): default 15-second timeout so a stuck
  // calendar can't hang the cron tick indefinitely. The official
  // OTS calendars typically respond within 200ms, so 15s is generous
  // even under bad network conditions. Caller can override by passing
  // an explicit `signal`.
  const signal = opts.signal ?? AbortSignal.timeout(15_000);

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
        signal,
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

// ─── Upgrade ──────────────────────────────────────────────────────────────

/**
 * Sprint 8B — Window an anchor must wait before it's eligible for
 * upgrade. Bitcoin block intervals average ~10 minutes; OpenTimestamps
 * calendars roll up many digests into a Merkle tree before each
 * commitment, so confirmed proofs typically appear ~3-6 hours after
 * submit. Six hours is the safe lower bound.
 */
export const UPGRADE_AGE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

/**
 * Upper bound on the upgrade poll. Anchors older than this without
 * a confirmed proof are likely lost (calendar permanently down,
 * digest discarded, etc.) — they get marked FAILED so the cron
 * stops re-polling them every day.
 */
export const UPGRADE_GIVE_UP_MS = 30 * 24 * 60 * 60 * 1000;

export type UpgradeOutcome =
  | { status: "UPGRADED"; proofBytes: number }
  | { status: "STILL_PENDING" }
  | { status: "GAVE_UP"; reason: string }
  | { status: "ERROR"; error: string };

export interface UpgradeAuditAnchorOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Now-clock injection point for tests. */
  now?: Date;
}

/**
 * Upgrade a single PENDING anchor by fetching the calendar's
 * confirmed proof at GET <calendar>/timestamp/<hex-digest>.
 *
 *   - **200 OK + non-empty body** → calendar has confirmed; replace
 *     otsProof with the new bytes, set status=UPGRADED + upgradedAt.
 *   - **404 Not Found** → calendar hasn't confirmed yet (Bitcoin
 *     hasn't mined the rollup block); leave the row alone, return
 *     STILL_PENDING.
 *   - **other** → transient (5xx, network error). Leave PENDING so
 *     the next tick retries. Returns ERROR for the cron to log.
 *   - **age > UPGRADE_GIVE_UP_MS** → mark GAVE_UP (status=FAILED)
 *     so we stop re-polling.
 */
/**
 * T5-10 (audit fix 2026-05-05): minimum upgraded-proof size sanity.
 * A confirmed OTS path proof carries the original 32-byte digest, the
 * sequence of hash/append/prepend operations that lift it to the
 * calendar's commitment, and a Bitcoin attestation header — even the
 * sparsest realistic proof exceeds 100 bytes. Anything below this is
 * either a server bug or a malicious truncation. The pending proof
 * (typically ~140 bytes) is also a lower bound — an upgrade only
 * grows the proof, never shrinks it.
 */
const MIN_OTS_UPGRADE_BYTES = 100;
/**
 * T5-10: ceiling on accepted proof size. A real OTS path proof for
 * a single digest is typically 1-10 KB after Bitcoin confirmation;
 * anything substantially larger is suspicious. 1 MB is a generous
 * ceiling that prevents a malicious calendar from stuffing the row
 * (and downstream bundle exports) with arbitrary garbage.
 */
const MAX_OTS_UPGRADE_BYTES = 1024 * 1024;

export async function upgradeAuditAnchor(
  anchorId: string,
  opts: UpgradeAuditAnchorOptions = {},
): Promise<UpgradeOutcome> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? new Date();
  // T5-9: default 15s timeout so a stuck calendar can't block the
  // upgrade cron. Caller can override.
  const signal = opts.signal ?? AbortSignal.timeout(15_000);

  const anchor = (await auditTimestampAnchor.findUnique({
    where: { id: anchorId },
    select: {
      id: true,
      anchorHash: true,
      calendarUrl: true,
      status: true,
      submittedAt: true,
      // T5-10: pull the pending-proof bytes so we can sanity-check
      // that the upgrade-response is at least as large.
      otsProof: true,
    },
  })) as {
    id: string;
    anchorHash: string;
    calendarUrl: string;
    status: string;
    submittedAt: Date;
    otsProof: Buffer;
  } | null;

  if (!anchor) {
    return { status: "ERROR", error: "anchor-not-found" };
  }
  if (anchor.status !== "PENDING") {
    return { status: "ERROR", error: `unexpected-status:${anchor.status}` };
  }

  const ageMs = now.getTime() - anchor.submittedAt.getTime();
  if (ageMs > UPGRADE_GIVE_UP_MS) {
    await auditTimestampAnchor.update({
      where: { id: anchor.id },
      data: {
        status: "FAILED",
        errorMessage: `give-up after ${Math.round(ageMs / (24 * 3600 * 1000))} days`,
      },
    });
    return {
      status: "GAVE_UP",
      reason: `> ${UPGRADE_GIVE_UP_MS / (24 * 3600 * 1000)}d without confirmation`,
    };
  }

  const url = `${anchor.calendarUrl.replace(/\/+$/, "")}/timestamp/${anchor.anchorHash}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { method: "GET", signal });
  } catch (err) {
    return {
      status: "ERROR",
      error: (err as Error).message ?? String(err),
    };
  }

  if (res.status === 404) {
    return { status: "STILL_PENDING" };
  }
  if (!res.ok) {
    return {
      status: "ERROR",
      error: `HTTP ${res.status} ${res.statusText}`,
    };
  }

  const proofArrayBuffer = await res.arrayBuffer();
  const proofBuffer = Buffer.from(proofArrayBuffer);
  if (proofBuffer.length === 0) {
    return { status: "ERROR", error: "calendar returned empty proof" };
  }

  // T5-10 (audit fix 2026-05-05): basic structural validation BEFORE
  // overwriting the trusted pending proof. Without a full OTS proof-
  // chain validator we cannot verify the Bitcoin attestation chain
  // here — that needs a library like javascript-opentimestamps and is
  // tracked as future work — but we can at least enforce that the
  // calendar's response looks like a real upgrade rather than empty
  // bytes, junk, or a truncated ping. Three checks:
  //   1. min absolute size — under 100 bytes is structurally invalid
  //   2. monotonic-in-size — upgrades ADD operations, never shrink
  //   3. max ceiling — defends against a malicious 100MB response
  if (proofBuffer.length < MIN_OTS_UPGRADE_BYTES) {
    return {
      status: "ERROR",
      error: `proof too small (${proofBuffer.length} bytes < ${MIN_OTS_UPGRADE_BYTES} min)`,
    };
  }
  if (proofBuffer.length < anchor.otsProof.length) {
    return {
      status: "ERROR",
      error: `proof shrank (${proofBuffer.length} < pending ${anchor.otsProof.length}) — calendar response is not a valid upgrade`,
    };
  }
  if (proofBuffer.length > MAX_OTS_UPGRADE_BYTES) {
    return {
      status: "ERROR",
      error: `proof too large (${proofBuffer.length} bytes > ${MAX_OTS_UPGRADE_BYTES} max)`,
    };
  }

  await auditTimestampAnchor.update({
    where: { id: anchor.id },
    data: {
      otsProof: proofBuffer,
      status: "UPGRADED",
      upgradedAt: now,
    },
  });
  return { status: "UPGRADED", proofBytes: proofBuffer.length };
}

export interface UpgradeAllResult {
  scanned: number;
  upgraded: number;
  stillPending: number;
  gaveUp: number;
  errored: number;
}

/**
 * Walk every PENDING anchor older than UPGRADE_AGE_THRESHOLD_MS
 * and try to upgrade it. Cap at 200 per tick — heavier fan-out
 * would risk hammering the calendars; daily cadence + the 6h
 * eligibility window means each anchor gets one upgrade attempt
 * per day on average, plenty after the typical 3-6h confirmation
 * window.
 */
export async function upgradeAllPendingAnchors(
  opts: UpgradeAuditAnchorOptions = {},
): Promise<UpgradeAllResult> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - UPGRADE_AGE_THRESHOLD_MS);
  const candidates = (await auditTimestampAnchor.findMany({
    where: { status: "PENDING", submittedAt: { lte: cutoff } },
    select: { id: true },
    orderBy: { submittedAt: "asc" },
    take: 200,
  })) as Array<{ id: string }>;

  let upgraded = 0;
  let stillPending = 0;
  let gaveUp = 0;
  let errored = 0;

  for (const a of candidates) {
    const out = await upgradeAuditAnchor(a.id, opts);
    if (out.status === "UPGRADED") upgraded += 1;
    else if (out.status === "STILL_PENDING") stillPending += 1;
    else if (out.status === "GAVE_UP") gaveUp += 1;
    else errored += 1;
  }

  return {
    scanned: candidates.length,
    upgraded,
    stillPending,
    gaveUp,
    errored,
  };
}
