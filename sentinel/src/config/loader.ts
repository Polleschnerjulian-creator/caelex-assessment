import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { configSchema } from "./schema.js";
import type { SentinelConfig } from "../types/config-types.js";

const CONFIG_PATHS = [
  "/config/config.yaml",
  "/config/config.yml",
  "./config/config.yaml",
  "./config/config.yml",
];

export function loadConfig(): SentinelConfig {
  // Try loading from file
  let rawConfig: Record<string, unknown> = {};
  let configLoaded = false;

  for (const path of CONFIG_PATHS) {
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      rawConfig = parse(content) as Record<string, unknown>;
      configLoaded = true;
      console.log(`[config] Loaded from ${path}`);
      break;
    }
  }

  if (!configLoaded) {
    console.log("[config] No config file found, using env vars + defaults");
  }

  // Override with environment variables
  const env = process.env;

  if (env["OPERATOR_ID"]) {
    rawConfig["sentinel"] = {
      ...(rawConfig["sentinel"] as Record<string, unknown> | undefined),
      operator_id: env["OPERATOR_ID"],
    };
  }

  if (env["OPERATOR_NAME"]) {
    rawConfig["sentinel"] = {
      ...(rawConfig["sentinel"] as Record<string, unknown> | undefined),
      operator_name: env["OPERATOR_NAME"],
    };
  }

  if (env["CAELEX_API_URL"]) {
    rawConfig["transport"] = {
      ...(rawConfig["transport"] as Record<string, unknown> | undefined),
      caelex_api_url: env["CAELEX_API_URL"],
    };
  }

  if (env["SENTINEL_TOKEN"]) {
    rawConfig["transport"] = {
      ...(rawConfig["transport"] as Record<string, unknown> | undefined),
      sentinel_token: env["SENTINEL_TOKEN"],
    };
  }

  if (env["MODE"]) {
    rawConfig["mode"] = env["MODE"];
  }

  // Ensure minimum defaults for simulator mode
  if (!rawConfig["sentinel"]) {
    rawConfig["sentinel"] = {
      operator_id: env["OPERATOR_ID"] || "demo-operator",
      operator_name: env["OPERATOR_NAME"] || "Demo Satellite Operator GmbH",
      satellites: [
        {
          norad_id: "58421",
          name: "CAELEX-SAT-1",
          orbit_type: "LEO",
          initial_altitude_km: 550,
          initial_inclination_deg: 97.6,
        },
      ],
    };
  }

  // Validate with Zod
  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error("[config] Validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid configuration");
  }

  return result.data as SentinelConfig;
}
