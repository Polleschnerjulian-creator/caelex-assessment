/**
 * SHIELD — LeoLabs CDM Client
 *
 * REST client for LeoLabs Conjunction API.
 * Server-only — mirrors space-track-client.server.ts pattern.
 * BYOK: operator provides their own API key.
 */

import "server-only";
import { logger } from "@/lib/logger";
import type { ParsedCDM } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeoLabsConjunction {
  conjunction_id: string;
  probability_of_collision: number;
  miss_distance_km: number;
  time_of_closest_approach: string;
  creation_date: string;
  primary: {
    norad_id: string;
    name: string;
    object_type: string;
  };
  secondary: {
    norad_id: string;
    name: string;
    object_type: string;
  };
  relative_speed_km_s: number | null;
}

export interface LeoLabsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.leolabs.space/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

// ─── CDM Mapping ─────────────────────────────────────────────────────────────

/**
 * Map a LeoLabs conjunction object to Shield's ParsedCDM format.
 *
 * Unit conversions:
 * - miss_distance_km: km -> meters (* 1000)
 * - relative_speed_km_s: km/s -> m/s (* 1000)
 */
export function mapLeoLabsCDMToParsed(conj: LeoLabsConjunction): ParsedCDM {
  return {
    cdmId: `leolabs-${conj.conjunction_id}`,
    creationDate: new Date(conj.creation_date),
    tca: new Date(conj.time_of_closest_approach),
    missDistanceMeters: conj.miss_distance_km * 1000,
    collisionProbability: conj.probability_of_collision,
    probabilityMethod: "LEOLABS",
    relativeSpeedMs:
      conj.relative_speed_km_s != null ? conj.relative_speed_km_s * 1000 : null,
    sat1NoradId: conj.primary.norad_id,
    sat1Name: conj.primary.name,
    sat1ObjectType: conj.primary.object_type,
    sat2NoradId: conj.secondary.norad_id,
    sat2Name: conj.secondary.name,
    sat2ObjectType: conj.secondary.object_type,
    sat2Maneuverable: null,
    rawCdm: conj as unknown as import("./types").SpaceTrackCDM,
  };
}

// ─── API Client ──────────────────────────────────────────────────────────────

/**
 * Fetch CDMs from LeoLabs for the given NORAD IDs.
 *
 * - Exponential backoff on transient errors
 * - Respects Retry-After header on 429
 * - Returns empty array on auth failure (invalid key) rather than throwing
 */
export async function fetchLeoLabsCDMs(
  config: LeoLabsClientConfig,
  noradIds: string[],
  since: Date,
): Promise<ParsedCDM[]> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (noradIds.length === 0) return [];

  const sinceStr = since.toISOString();
  const url = `${baseUrl}/conjunctions?norad_ids=${noradIds.join(",")}&start_time=${sinceStr}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        logger.error("[Shield/LeoLabs] API key invalid or expired");
        return [];
      }

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") ?? "60",
          10,
        );
        logger.warn(`[Shield/LeoLabs] Rate limited, waiting ${retryAfter}s`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!response.ok) {
        if (attempt < MAX_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          logger.warn(
            `[Shield/LeoLabs] HTTP ${response.status}, retrying in ${backoff}ms`,
          );
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        logger.error(
          `[Shield/LeoLabs] Failed after ${MAX_RETRIES} attempts: ${response.status}`,
        );
        return [];
      }

      const data = (await response.json()) as LeoLabsConjunction[];
      logger.info(`[Shield/LeoLabs] Fetched ${data.length} conjunctions`);
      return data.map(mapLeoLabsCDMToParsed);
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const backoff = 1000 * Math.pow(2, attempt);
        logger.warn(`[Shield/LeoLabs] Error, retrying in ${backoff}ms`, err);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      logger.error("[Shield/LeoLabs] Failed after retries", err);
      return [];
    }
  }

  return [];
}

/**
 * Test LeoLabs API key validity.
 */
export async function testLeoLabsConnection(
  apiKey: string,
  baseUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${baseUrl ?? DEFAULT_BASE_URL}/conjunctions?limit=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid or expired API key" };
    }

    if (!response.ok) {
      return { ok: false, error: `LeoLabs API returned ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
