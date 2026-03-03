import { z } from "zod";

const satelliteSchema = z.object({
  norad_id: z.string().min(1),
  name: z.string().min(1),
  orbit_type: z.enum(["LEO", "MEO", "GEO", "SSO", "HEO"]),
  initial_altitude_km: z.number().positive().optional(),
  initial_inclination_deg: z.number().min(0).max(180).optional(),
});

const collectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  schedule: z.string().default("*/15 * * * *"),
});

export const configSchema = z.object({
  sentinel: z.object({
    operator_id: z.string().min(1),
    operator_name: z.string().min(1),
    satellites: z.array(satelliteSchema).min(1),
  }),
  collectors: z.object({
    orbit_debris: collectorConfigSchema.default({
      enabled: true,
      schedule: "*/15 * * * *",
    }),
    cybersecurity: collectorConfigSchema.default({
      enabled: true,
      schedule: "0 * * * *",
    }),
    ground_station: collectorConfigSchema.default({
      enabled: true,
      schedule: "0 */6 * * *",
    }),
    document_watch: collectorConfigSchema.default({
      enabled: true,
      schedule: "0 0 * * *",
    }),
  }),
  transport: z
    .object({
      caelex_api_url: z.string().url().default("https://caelex.eu"),
      sentinel_token: z.string().min(1).default(""),
      retry_max_attempts: z.number().int().positive().default(10),
      retry_max_delay_ms: z.number().int().positive().default(3600000),
      buffer_max_days: z.number().int().positive().default(30),
    })
    .default({}),
  dashboard: z
    .object({
      enabled: z.boolean().default(true),
      port: z.number().int().min(1024).max(65535).default(8443),
    })
    .default({}),
  mode: z.enum(["simulator", "production"]).default("simulator"),
});

export type ValidatedConfig = z.infer<typeof configSchema>;
