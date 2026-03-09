import "server-only";
import { logger } from "@/lib/logger";
import type { SpaceTrackCDM, ParsedCDM } from "./types";

// ─── Configuration ──────────────────────────────────────────────────────────

const SPACE_TRACK_BASE = "https://www.space-track.org";
const LOGIN_URL = `${SPACE_TRACK_BASE}/ajaxauth/login`;
const CDM_URL = `${SPACE_TRACK_BASE}/basicspacedata/query/class/cdm_public`;

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ─── Session State ──────────────────────────────────────────────────────────

let sessionCookie: string | null = null;
let sessionExpiry = 0;

// ─── Config Check ───────────────────────────────────────────────────────────

/**
 * Check whether Space-Track credentials are configured and enabled.
 */
export function isSpaceTrackConfigured(): boolean {
  if (process.env.SPACETRACK_ENABLED === "false") {
    return false;
  }
  return !!(process.env.SPACETRACK_IDENTITY && process.env.SPACETRACK_PASSWORD);
}

// ─── Session Management ─────────────────────────────────────────────────────

async function login(): Promise<string> {
  const identity = process.env.SPACETRACK_IDENTITY;
  const password = process.env.SPACETRACK_PASSWORD;

  if (!identity || !password) {
    throw new Error("Space-Track credentials not configured");
  }

  logger.info("[SpaceTrack] Authenticating...");

  const body = new URLSearchParams({ identity, password });
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Space-Track login failed: ${response.status}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Space-Track login did not return a session cookie");
  }

  // Extract cookie value — take the first cookie
  const cookie = setCookie.split(";")[0]!;
  // Session valid for 2 hours, refresh after 1.5 hours
  sessionCookie = cookie;
  sessionExpiry = Date.now() + 90 * 60 * 1000;

  logger.info("[SpaceTrack] Authentication successful");
  return cookie;
}

async function getSessionCookie(): Promise<string> {
  if (sessionCookie && Date.now() < sessionExpiry) {
    return sessionCookie;
  }
  return login();
}

// ─── CDM Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a raw Space-Track CDM record into canonical Caelex format.
 *
 * Unit conversions:
 * - MIN_RNG: km -> meters (* 1000)
 * - RELATIVE_SPEED: km/s -> m/s (* 1000)
 * - PC: string -> float (supports scientific notation)
 */
export function parseCDM(raw: SpaceTrackCDM): ParsedCDM {
  return {
    cdmId: raw.CDM_ID,
    creationDate: new Date(raw.CREATION_DATE),
    tca: new Date(raw.TCA),
    missDistanceMeters: parseFloat(raw.MIN_RNG) * 1000,
    collisionProbability: parseFloat(raw.PC),
    probabilityMethod: raw.PC_METHOD,
    relativeSpeedMs:
      raw.RELATIVE_SPEED != null ? parseFloat(raw.RELATIVE_SPEED) * 1000 : null,
    sat1NoradId: raw.SAT_1_ID,
    sat1Name: raw.SAT_1_NAME,
    sat1ObjectType: raw.SAT1_OBJECT_TYPE,
    sat2NoradId: raw.SAT_2_ID,
    sat2Name: raw.SAT_2_NAME,
    sat2ObjectType: raw.SAT2_OBJECT_TYPE,
    sat2Maneuverable: raw.SAT2_MANEUVERABLE,
    rawCdm: raw,
  };
}

/**
 * Parse an array of raw Space-Track CDMs, skipping entries with invalid Pc.
 */
export function parseSpaceTrackResponse(data: SpaceTrackCDM[]): ParsedCDM[] {
  const results: ParsedCDM[] = [];

  for (const raw of data) {
    const pc = parseFloat(raw.PC);
    if (isNaN(pc)) {
      logger.warn("[SpaceTrack] Skipping CDM with invalid Pc", {
        cdmId: raw.CDM_ID,
        pc: raw.PC,
      });
      continue;
    }
    results.push(parseCDM(raw));
  }

  return results;
}

// ─── CDM Fetching ───────────────────────────────────────────────────────────

/**
 * Delay execution by `ms` milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch CDMs from Space-Track with retry and exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  cookie: string,
  attempt = 0,
): Promise<SpaceTrackCDM[]> {
  const response = await fetch(url, {
    headers: { Cookie: cookie },
  });

  // Re-authenticate on 401
  if (response.status === 401) {
    logger.warn("[SpaceTrack] Session expired, re-authenticating...");
    const newCookie = await login();
    return fetchWithRetry(url, newCookie, attempt);
  }

  // Exponential backoff on 429
  if (response.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(
        `Space-Track rate limit exceeded after ${MAX_RETRIES} retries`,
      );
    }
    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    logger.warn("[SpaceTrack] Rate limited, backing off", { backoff, attempt });
    await delay(backoff);
    return fetchWithRetry(url, cookie, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Space-Track CDM request failed: ${response.status}`);
  }

  return (await response.json()) as SpaceTrackCDM[];
}

/**
 * Fetch CDMs for a list of NORAD IDs from the Space-Track API.
 *
 * - Batches IDs in groups of 50
 * - 2s delay between batches to respect rate limits
 * - Exponential backoff on 429
 * - Re-authenticates on 401
 *
 * @param noradIds - List of NORAD catalog IDs to query
 * @param sinceDays - How many days back to query (default: 7)
 */
export async function fetchCDMs(
  noradIds: string[],
  sinceDays = 7,
): Promise<ParsedCDM[]> {
  if (!isSpaceTrackConfigured()) {
    logger.warn(
      "[SpaceTrack] Not configured or disabled, returning empty results",
    );
    return [];
  }

  if (noradIds.length === 0) {
    return [];
  }

  const cookie = await getSessionCookie();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceStr = sinceDate.toISOString().split("T")[0];

  // Batch NORAD IDs
  const batches: string[][] = [];
  for (let i = 0; i < noradIds.length; i += BATCH_SIZE) {
    batches.push(noradIds.slice(i, i + BATCH_SIZE));
  }

  const allCdms: ParsedCDM[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const idList = batch.join(",");
    const url = `${CDM_URL}/SAT_1_ID/${idList}/CREATION_DATE/%3E${sinceStr}/orderby/TCA%20asc/format/json`;

    logger.info("[SpaceTrack] Fetching CDM batch", {
      batch: i + 1,
      total: batches.length,
      ids: batch.length,
    });

    try {
      const rawCdms = await fetchWithRetry(url, cookie);
      const parsed = parseSpaceTrackResponse(rawCdms);
      allCdms.push(...parsed);
    } catch (error) {
      logger.error("[SpaceTrack] Batch fetch failed", error, {
        batch: i + 1,
        ids: batch.slice(0, 5),
      });
      // Continue with next batch rather than failing entirely
    }

    // Rate limit: delay between batches (skip after last batch)
    if (i < batches.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  logger.info("[SpaceTrack] CDM fetch complete", {
    totalCdms: allCdms.length,
    batches: batches.length,
  });

  return allCdms;
}
