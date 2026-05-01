/**
 * VIES (VAT Information Exchange System) Adapter — Sprint 2A
 *
 * VIES is the European Commission's VAT-validation gateway. It exposes
 * each member-state's tax authority via a single endpoint. Given a VAT-ID
 * like "DE123456789", VIES returns whether the ID is valid and — for some
 * member states — the company name and registered address.
 *
 * **Source URL:**
 *   https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number
 *
 * **POST body:**
 *   { "countryCode": "DE", "vatNumber": "123456789", "requesterMemberStateCode": "", "requesterNumber": "" }
 *
 * **Response:**
 *   {
 *     "isValid": true,
 *     "name": "ACME GMBH" | "---",
 *     "address": "Musterstr. 1, 12345 Berlin" | "---",
 *     "requestDate": "2026-04-30T...",
 *     ...
 *   }
 *
 * **Privacy quirk:** for German VAT IDs, VIES returns "name": "---" and
 * "address": "---" — German tax law forbids cross-border name disclosure
 * via VIES. So for DE we only get `isValid`. For NL/FR/BE/IT/ES we get
 * the full record.
 *
 * **What we extract:**
 *   - `establishment` (T2) — derived from VAT-ID country code, ALWAYS
 *     extractable when `isValid: true`
 *   - `legalName` (T2) — extracted from `name` field, only for non-DE
 *     member states (DE returns "---")
 *
 * **Caveats:**
 *   - VIES has rate limits (undocumented, ~10 req/sec/IP empirically)
 *   - The endpoint is documented as "for occasional use"; bulk callers
 *     should use the SOAP `checkVatService` instead
 *   - The endpoint is technically a website-AJAX route, not an officially-
 *     supported API. EU Commission may change it. We handle that by
 *     returning `errorKind: "remote-error"` on parse failure.
 *
 * **Auth:** none — public endpoint
 *
 * Reference: https://ec.europa.eu/taxation_customs/vies/
 */

import "server-only";

import type {
  AdapterInput,
  AdapterOutcome,
  AutoDetectionAdapter,
  DetectedField,
} from "./types";

const VIES_ENDPOINT =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

/** Default fetch timeout — VIES is usually <500 ms but can spike to 5 s+. */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Strict EU VAT-ID pattern. Two-letter country code + 2–14 alphanumerics
 * with at least one digit (validated separately below). Each member state
 * has its own format inside that — we validate locally to avoid wasting a
 * VIES request on garbage input. The regex is intentionally permissive on
 * the digit portion; VIES enforces the country-specific format on its side.
 */
const VAT_ID_PATTERN = /^([A-Z]{2})([A-Z0-9]{2,14})$/;

/**
 * Country codes that VIES will validate. Includes EU-27 + XI for Northern
 * Ireland (post-Brexit special case). Operators outside this set need a
 * different adapter (e.g. UK uses HMRC's check-vat-number service).
 */
const VIES_SUPPORTED_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "XI",
]);

/**
 * Member states where VIES returns "---" for name/address (privacy
 * legislation prevents cross-border disclosure). For these, we only
 * extract `establishment`.
 */
const VIES_NAME_REDACTED_COUNTRIES = new Set(["DE", "ES"]);

interface ViesResponse {
  isValid?: boolean;
  countryCode?: string;
  vatNumber?: string;
  name?: string;
  address?: string;
  requestDate?: string;
  // Plus a few VIES-specific fields we don't read (consultationNumber,
  // requesterMemberStateCode etc.)
  [k: string]: unknown;
}

// ─── Adapter Implementation ────────────────────────────────────────────────

export const viesAdapter: AutoDetectionAdapter = {
  source: "vies-eu-vat",
  displayName: "VIES (EU VAT Validation)",

  canDetect(input: AdapterInput): boolean {
    if (!input.vatId) return false;
    const parsed = parseVatId(input.vatId);
    if (!parsed) return false;
    return VIES_SUPPORTED_COUNTRIES.has(parsed.country);
  },

  async detect(input: AdapterInput): Promise<AdapterOutcome> {
    const parsed = input.vatId ? parseVatId(input.vatId) : null;
    if (!parsed) {
      return {
        ok: false,
        source: "vies-eu-vat",
        errorKind: "missing-input",
        message: "VIES adapter requires a well-formed EU VAT-ID",
      };
    }
    if (!VIES_SUPPORTED_COUNTRIES.has(parsed.country)) {
      return {
        ok: false,
        source: "vies-eu-vat",
        errorKind: "missing-input",
        message: `VIES does not validate VAT IDs for country ${parsed.country}`,
      };
    }

    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeAbortSignals(input.signal, controller.signal);

    let raw: string;
    let parsedJson: ViesResponse;

    try {
      const response = await fetchImpl(VIES_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          // VIES rejects requests without a UA on some edge nodes
          "user-agent": "Caelex/1.0 (+https://caelex.eu)",
        },
        body: JSON.stringify({
          countryCode: parsed.country,
          vatNumber: parsed.number,
          requesterMemberStateCode: "",
          requesterNumber: "",
        }),
        signal,
      });

      // VIES returns 429 when rate-limited
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return {
          ok: false,
          source: "vies-eu-vat",
          errorKind: "rate-limited",
          message: "VIES rate-limited the request",
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          source: "vies-eu-vat",
          errorKind: "remote-error",
          message: `VIES returned HTTP ${response.status}`,
        };
      }

      raw = await response.text();
      try {
        parsedJson = JSON.parse(raw) as ViesResponse;
      } catch (e) {
        return {
          ok: false,
          source: "vies-eu-vat",
          errorKind: "parse-error",
          message: `VIES response was not JSON: ${(e as Error).message}`,
        };
      }
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      if ((err as Error).name === "AbortError") {
        return {
          ok: false,
          source: "vies-eu-vat",
          errorKind: "timeout",
          message: `VIES request timed out after ${timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        source: "vies-eu-vat",
        errorKind: "network",
        message: `VIES network error: ${message}`,
      };
    } finally {
      clearTimeout(timer);
    }

    // VIES "isValid: false" is NOT an adapter error — it's a successful
    // detection that says the VAT-ID is bogus. We surface that as a result
    // with `isValid` info but no field promotions.
    if (parsedJson.isValid === false) {
      return {
        ok: true,
        result: {
          source: "vies-eu-vat",
          fetchedAt: new Date(),
          sourceUrl: `${VIES_ENDPOINT} (POST ${parsed.country}${parsed.number})`,
          rawArtifact: parsedJson as Record<string, unknown>,
          attestation: {
            kind: "public-source",
            source: "other",
            sourceUrl: VIES_ENDPOINT,
            fetchedAt: new Date().toISOString(),
          },
          fields: [],
          warnings: [
            `VIES reports VAT-ID ${input.vatId} as INVALID. The operator may have entered the wrong VAT-ID.`,
          ],
        },
      };
    }

    if (parsedJson.isValid !== true) {
      return {
        ok: false,
        source: "vies-eu-vat",
        errorKind: "parse-error",
        message: "VIES response missing 'isValid' field",
      };
    }

    // Extract fields. `establishment` is always extractable; `legalName`
    // only when the member state allows VIES to disclose it.
    const fields: DetectedField[] = [];
    const warnings: string[] = [];

    fields.push({
      fieldName: "establishment",
      value: parsed.country,
      confidence: 0.98,
      evidenceText: `VAT-ID ${input.vatId} validated by VIES; country code "${parsed.country}" implies establishment`,
    });

    const nameRaw = (parsedJson.name ?? "").trim();
    if (nameRaw && nameRaw !== "---" && nameRaw !== "") {
      // Future legalName field promotion would go here (Sprint 1B
      // OperatorProfile didn't have legalName as a writable verified field
      // — kept for Sprint 5 when we add it to the WritableVerifiedField union).
      // For Sprint 2A we just include it in the warnings as a soft signal.
      warnings.push(
        `VIES returned legal-name "${nameRaw}" — not yet auto-stored, awaiting Sprint 5 field expansion`,
      );
    } else if (VIES_NAME_REDACTED_COUNTRIES.has(parsed.country)) {
      warnings.push(
        `${parsed.country} VAT regulations forbid name-disclosure via VIES; operator-supplied legal-name cannot be cross-checked here`,
      );
    }

    return {
      ok: true,
      result: {
        source: "vies-eu-vat",
        fetchedAt: new Date(),
        sourceUrl: `${VIES_ENDPOINT} (POST ${parsed.country}${parsed.number})`,
        rawArtifact: parsedJson as Record<string, unknown>,
        attestation: {
          kind: "public-source",
          source: "other",
          sourceUrl: VIES_ENDPOINT,
          fetchedAt: new Date().toISOString(),
        },
        fields,
        warnings,
      },
    };
  },
};

// ─── Internals ─────────────────────────────────────────────────────────────

interface ParsedVatId {
  country: string;
  number: string;
}

/**
 * Parse a VAT-ID into its country code + numeric portion. Returns null if
 * the input doesn't look like an EU VAT-ID. Whitespace and dots are
 * stripped — operators frequently paste "DE 123 456 789" with spaces.
 */
export function parseVatId(rawInput: string): ParsedVatId | null {
  const cleaned = rawInput.replace(/[\s.\-]/g, "").toUpperCase();
  const m = cleaned.match(VAT_ID_PATTERN);
  if (!m) return null;
  // Real VAT-IDs always contain at least one digit. Reject "ABCDEF" early.
  if (!/\d/.test(m[2])) return null;
  return { country: m[1], number: m[2] };
}

function mergeAbortSignals(
  external: AbortSignal | undefined,
  internal: AbortSignal,
): AbortSignal {
  if (!external) return internal;
  // If either is already aborted, return that one
  if (external.aborted) return external;
  if (internal.aborted) return internal;
  // Otherwise compose: AbortSignal.any if available, else manual fallback
  const anyFn = (
    AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof anyFn === "function") return anyFn([external, internal]);
  // Fallback for older runtimes — listen on both, abort our internal
  external.addEventListener("abort", () => {
    if (!internal.aborted) {
      // Cannot abort a foreign signal directly — re-emit on the internal
      // controller via dispatching abort. Best-effort fallback.
    }
  });
  return internal;
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────

export const __test = { VIES_ENDPOINT, parseVatId };
