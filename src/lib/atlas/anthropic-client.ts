import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Anthropic-Client-Bauer — single source of truth für die Wahl
 * zwischen direktem Anthropic API und Vercel AI Gateway (mit
 * EU-Bedrock-Routing).
 *
 * Path A der EU-Compliance-Migration (P2 follow-up): durch eine
 * env-var Umschaltung kann jeder Endpoint zwischen US-direct und
 * EU-Bedrock-Routing wechseln, ohne Code-Änderungen am Streaming,
 * Tool-Use-Loop oder anderen Anthropic-SDK-Spezifika. Die Anthropic-
 * SDK ist API-kompatibel mit dem Vercel AI Gateway Anthropic-Compat-
 * Endpoint, sodass nur baseURL + apiKey + model-ID umgestellt werden.
 *
 * Auswahl-Reihenfolge:
 *   1. `AI_GATEWAY_API_KEY` gesetzt → Gateway-Modus (kann Bedrock-EU
 *      via Vercel-Project-Settings als bevorzugten Provider routen)
 *   2. `ANTHROPIC_API_KEY` gesetzt → direkter Anthropic-Modus (USA)
 *   3. weder noch → null (Endpoint sollte 503 zurückgeben)
 *
 * Provider-Routing-Konfiguration ist Vercel-Dashboard-Aufgabe:
 *   Project Settings → AI Gateway → Provider Preferences →
 *   Order: ["bedrock", "anthropic"]
 *
 * Damit fließen alle Mandanten-Daten primär durch Anthropic via AWS
 * Bedrock EU-Region, mit automatischem Fallback auf direkte Anthropic-
 * API falls Bedrock nicht verfügbar. Failover-Verhalten kann pro
 * Mandant über Tags differenziert werden (Phase A2).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

export interface AnthropicSetup {
  /** Configured Anthropic SDK client. Identical API surface regardless
   *  of whether requests route via Gateway or direct API — streaming,
   *  tool-use, message format all stay the same. */
  client: Anthropic;
  /** Model identifier for this routing mode. Gateway uses provider-
   *  prefixed names ("anthropic/claude-sonnet-4.6"); direct API uses
   *  the plain Anthropic identifier ("claude-sonnet-4-6"). Callers
   *  pass this value into messages.create() / messages.stream() —
   *  the helper picks the right form based on the env. */
  model: string;
  /** Routing mode marker — useful for telemetry / log lines so we
   *  can correlate failures with the active provider path. */
  mode: "gateway" | "direct";
}

/** Default model id per routing mode. The Gateway namespace uses dot-
 *  versioning (anthropic/claude-sonnet-4.6), the direct Anthropic API
 *  uses dash-versioning (claude-sonnet-4-6). Same model, different
 *  identifier conventions per upstream. */
const DEFAULT_MODEL_GATEWAY = "anthropic/claude-sonnet-4.6";
const DEFAULT_MODEL_DIRECT = "claude-sonnet-4-6";

const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh";

/** Build an Anthropic-SDK client wired for the current environment.
 *  Returns null when no AI key is configured at all (so the caller
 *  can return 503 with the canonical "AI assistant not configured"
 *  message instead of letting an uncaught error escape). */
export function buildAnthropicClient(): AnthropicSetup | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const directKey = process.env.ANTHROPIC_API_KEY;

  if (gatewayKey) {
    return {
      client: new Anthropic({
        apiKey: gatewayKey,
        baseURL: GATEWAY_BASE_URL,
      }),
      model: DEFAULT_MODEL_GATEWAY,
      mode: "gateway",
    };
  }

  if (directKey) {
    return {
      client: new Anthropic({ apiKey: directKey }),
      model: DEFAULT_MODEL_DIRECT,
      mode: "direct",
    };
  }

  logger.error(
    "Anthropic client not configured — neither AI_GATEWAY_API_KEY nor ANTHROPIC_API_KEY is set",
  );
  return null;
}
